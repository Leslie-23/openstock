import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;
  const session = await getUserSession(event);

  const invoice = await db.query.invoices.findFirst({
    where: eq(accountingTables.invoices.id, id),
    with: { customer: true },
  });

  if (!invoice) {
    throw createError({ statusCode: 404, message: 'Invoice not found' });
  }

  if (invoice.status !== 'draft') {
    throw createError({ statusCode: 400, message: 'Only draft invoices can be sent' });
  }

  // Look up required accounts
  const arAccount = await db
    .select()
    .from(accountingTables.accounts)
    .where(eq(accountingTables.accounts.code, '1100'))
    .get();

  const salesAccount = await db
    .select()
    .from(accountingTables.accounts)
    .where(eq(accountingTables.accounts.code, '4000'))
    .get();

  const taxAccount = await db
    .select()
    .from(accountingTables.accounts)
    .where(eq(accountingTables.accounts.code, '2100'))
    .get();

  if (!arAccount || !salesAccount) {
    throw createError({ statusCode: 500, message: 'Required accounts (1100 AR, 4000 Sales) not found. Please seed accounts first.' });
  }

  // Build journal entry lines
  const journalLines: { accountId: string; debit: number; credit: number; description?: string }[] = [
    {
      accountId: arAccount.id,
      debit: invoice.total || 0,
      credit: 0,
      description: `AR for ${invoice.invoiceNumber}`,
    },
    {
      accountId: salesAccount.id,
      debit: 0,
      credit: invoice.subtotal || 0,
      description: `Sales revenue for ${invoice.invoiceNumber}`,
    },
  ];

  if ((invoice.taxTotal || 0) > 0) {
    if (!taxAccount) {
      throw createError({ statusCode: 500, message: 'Tax Payable account (2100) not found. Please seed accounts first.' });
    }
    journalLines.push({
      accountId: taxAccount.id,
      debit: 0,
      credit: invoice.taxTotal || 0,
      description: `Tax payable for ${invoice.invoiceNumber}`,
    });
  }

  // Create the journal entry
  const journalEntry = await createJournalEntry(db, {
    date: invoice.issueDate,
    description: `Invoice ${invoice.invoiceNumber} - ${invoice.customer?.name || 'Customer'}`,
    reference: invoice.id,
    referenceType: 'invoice',
    lines: journalLines,
    createdBy: session.user?.id,
    status: 'posted',
  });

  const now = new Date();

  // Update invoice status and store journal entry
  await db
    .update(accountingTables.invoices)
    .set({
      status: 'sent',
      journalEntryId: journalEntry.id,
      updatedAt: now,
    })
    .where(eq(accountingTables.invoices.id, id));

  // Create accounts receivable record
  await db.insert(accountingTables.accountsReceivable).values({
    id: generateId('ar'),
    customerId: invoice.customerId!,
    invoiceId: invoice.id,
    originalAmount: invoice.total || 0,
    balanceDue: invoice.total || 0,
    dueDate: invoice.dueDate,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  });

  return { success: true, journalEntryId: journalEntry.id };
});
