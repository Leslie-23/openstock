import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  const session = await getUserSession(event);

  if (!body.amount || !body.paymentDate) {
    throw createError({ statusCode: 400, message: 'amount and paymentDate are required' });
  }

  const invoice = await db
    .select()
    .from(accountingTables.invoices)
    .where(eq(accountingTables.invoices.id, id))
    .get();

  if (!invoice) {
    throw createError({ statusCode: 404, message: 'Invoice not found' });
  }

  if (invoice.status === 'draft' || invoice.status === 'void' || invoice.status === 'cancelled') {
    throw createError({ statusCode: 400, message: `Cannot record payment on ${invoice.status} invoice` });
  }

  const paymentAmount = round2(body.amount);
  const newAmountPaid = round2((invoice.amountPaid || 0) + paymentAmount);

  // Look up required accounts
  const cashAccount = await db
    .select()
    .from(accountingTables.accounts)
    .where(eq(accountingTables.accounts.code, '1000'))
    .get();

  const arAccount = await db
    .select()
    .from(accountingTables.accounts)
    .where(eq(accountingTables.accounts.code, '1100'))
    .get();

  if (!cashAccount || !arAccount) {
    throw createError({ statusCode: 500, message: 'Required accounts (1000 Cash, 1100 AR) not found. Please seed accounts first.' });
  }

  // Create journal entry: DR Cash, CR AR
  const journalEntry = await createJournalEntry(db, {
    date: body.paymentDate,
    description: `Payment received for ${invoice.invoiceNumber}`,
    reference: invoice.id,
    referenceType: 'payment',
    lines: [
      {
        accountId: cashAccount.id,
        debit: paymentAmount,
        credit: 0,
        description: `Cash received for ${invoice.invoiceNumber}`,
      },
      {
        accountId: arAccount.id,
        debit: 0,
        credit: paymentAmount,
        description: `AR reduction for ${invoice.invoiceNumber}`,
      },
    ],
    createdBy: session.user?.id,
    status: 'posted',
  });

  const now = new Date();

  // Create payment record
  const paymentId = generateId('ipay');
  await db.insert(accountingTables.invoicePayments).values({
    id: paymentId,
    invoiceId: id,
    amount: paymentAmount,
    paymentDate: body.paymentDate,
    paymentMethod: body.paymentMethod || null,
    reference: body.reference || null,
    notes: body.notes || null,
    journalEntryId: journalEntry.id,
    createdAt: now,
  });

  // Update invoice
  const newStatus = newAmountPaid >= (invoice.total || 0) ? 'paid' : 'partial';
  await db
    .update(accountingTables.invoices)
    .set({
      amountPaid: newAmountPaid,
      status: newStatus,
      updatedAt: now,
    })
    .where(eq(accountingTables.invoices.id, id));

  // Update AR record
  const arRecord = await db
    .select()
    .from(accountingTables.accountsReceivable)
    .where(eq(accountingTables.accountsReceivable.invoiceId, id))
    .get();

  if (arRecord) {
    const newBalanceDue = round2(arRecord.balanceDue - paymentAmount);
    const arStatus = newBalanceDue <= 0 ? 'paid' : 'partial';

    await db
      .update(accountingTables.accountsReceivable)
      .set({
        balanceDue: Math.max(0, newBalanceDue),
        status: arStatus,
        updatedAt: now,
      })
      .where(eq(accountingTables.accountsReceivable.id, arRecord.id));
  }

  return { success: true, paymentId, journalEntryId: journalEntry.id };
});
