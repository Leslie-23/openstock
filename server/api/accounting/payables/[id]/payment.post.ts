import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  const session = await getUserSession(event);

  if (!body.amount || !body.paymentDate) {
    throw createError({
      statusCode: 400,
      message: 'amount and paymentDate are required',
    });
  }

  const paymentAmount = round2(Number(body.amount));

  // Find the AP record
  const apRecord = await db.query.accountsPayable.findFirst({
    where: eq(accountingTables.accountsPayable.id, id),
  });

  if (!apRecord) {
    throw createError({ statusCode: 404, message: 'Accounts payable record not found' });
  }

  if (apRecord.status === 'paid') {
    throw createError({ statusCode: 400, message: 'This bill has already been fully paid' });
  }

  if (paymentAmount > (apRecord.balanceDue || 0)) {
    throw createError({
      statusCode: 400,
      message: `Payment amount (${paymentAmount}) exceeds balance due (${apRecord.balanceDue})`,
    });
  }

  // Find Accounts Payable (2000) and Cash (1000) accounts
  const apAccount = await db.query.accounts.findFirst({
    where: eq(accountingTables.accounts.code, '2000'),
  });

  const cashAccount = await db.query.accounts.findFirst({
    where: eq(accountingTables.accounts.code, '1000'),
  });

  if (!apAccount || !cashAccount) {
    throw createError({
      statusCode: 500,
      message: 'Required accounts (2000 Accounts Payable, 1000 Cash) not found. Please seed accounts first.',
    });
  }

  // Create journal entry for the payment
  const journalEntry = await createJournalEntry(db, {
    date: body.paymentDate,
    description: `AP Payment: ${apRecord.description}`,
    reference: id,
    referenceType: 'ap_payment',
    lines: [
      {
        accountId: apAccount.id,
        debit: paymentAmount,
        credit: 0,
        description: `Payment on AP: ${apRecord.description}`,
      },
      {
        accountId: cashAccount.id,
        debit: 0,
        credit: paymentAmount,
        description: `Payment on AP: ${apRecord.description}`,
      },
    ],
    createdBy: session.user?.id,
    status: 'posted',
  });

  // Create payment record
  const paymentId = generateId('appay');
  const now = new Date();

  await db.insert(accountingTables.apPayments).values({
    id: paymentId,
    accountsPayableId: id,
    amount: paymentAmount,
    paymentDate: body.paymentDate,
    paymentMethod: body.paymentMethod || null,
    reference: body.reference || null,
    notes: body.notes || null,
    journalEntryId: journalEntry.id,
    createdAt: now,
  });

  // Update AP balance and status
  const newBalance = round2((apRecord.balanceDue || 0) - paymentAmount);
  const newStatus = newBalance <= 0 ? 'paid' : 'partial';

  await db
    .update(accountingTables.accountsPayable)
    .set({
      balanceDue: newBalance,
      status: newStatus,
      updatedAt: now,
    })
    .where(eq(accountingTables.accountsPayable.id, id));

  return {
    paymentId,
    amount: paymentAmount,
    balanceDue: newBalance,
    status: newStatus,
    journalEntryId: journalEntry.id,
  };
});
