import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const body = await readBody(event);
  const session = await getUserSession(event);

  if (!body.supplierId || !body.description || !body.originalAmount || !body.issueDate || !body.dueDate) {
    throw createError({
      statusCode: 400,
      message: 'supplierId, description, originalAmount, issueDate, and dueDate are required',
    });
  }

  const originalAmount = round2(Number(body.originalAmount));
  const id = generateId('ap');
  const now = new Date();

  // Find Inventory/Expense account (1200) and Accounts Payable account (2000)
  const inventoryAccount = await db.query.accounts.findFirst({
    where: eq(accountingTables.accounts.code, '1200'),
  });

  const apAccount = await db.query.accounts.findFirst({
    where: eq(accountingTables.accounts.code, '2000'),
  });

  if (!inventoryAccount || !apAccount) {
    throw createError({
      statusCode: 500,
      message: 'Required accounts (1200 Inventory, 2000 Accounts Payable) not found. Please seed accounts first.',
    });
  }

  // Create journal entry for the bill
  const journalEntry = await createJournalEntry(db, {
    date: body.issueDate,
    description: `AP Bill: ${body.description}`,
    reference: id,
    referenceType: 'ap_bill',
    lines: [
      {
        accountId: inventoryAccount.id,
        debit: originalAmount,
        credit: 0,
        description: body.description,
      },
      {
        accountId: apAccount.id,
        debit: 0,
        credit: originalAmount,
        description: body.description,
      },
    ],
    createdBy: session.user?.id,
    status: 'posted',
  });

  await db.insert(accountingTables.accountsPayable).values({
    id,
    supplierId: body.supplierId,
    description: body.description,
    originalAmount,
    balanceDue: originalAmount,
    issueDate: body.issueDate,
    dueDate: body.dueDate,
    reference: body.reference || null,
    status: 'open',
    journalEntryId: journalEntry.id,
    createdAt: now,
    updatedAt: now,
  });

  return { id, originalAmount, journalEntryId: journalEntry.id };
});
