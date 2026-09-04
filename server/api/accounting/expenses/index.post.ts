import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const body = await readBody(event);
  const session = await getUserSession(event);

  if (!body.accountId || !body.description || !body.amount || !body.date) {
    throw createError({
      statusCode: 400,
      message: 'accountId, description, amount, and date are required',
    });
  }

  const amount = round2(Number(body.amount));
  let taxRate = 0;
  let taxAmount = 0;
  let totalAmount = amount;

  // Look up tax rate if taxId provided
  if (body.taxId) {
    const mainDb = useDB();
    const tax = await mainDb.query.taxes.findFirst({
      where: eq(tables.taxes.id, body.taxId),
    });
    if (!tax) {
      throw createError({ statusCode: 404, message: 'Tax not found' });
    }
    taxRate = tax.rate;
    taxAmount = round2(amount * taxRate / 100);
    totalAmount = round2(amount + taxAmount);
  }

  const expenseNumber = await getNextNumber(db, 'expenses', 'expense_number', 'EXP');
  const id = generateId('exp');
  const now = new Date();

  // Find Cash account (1000) for credit side
  const cashAccount = await db.query.accounts.findFirst({
    where: eq(accountingTables.accounts.code, '1000'),
  });

  if (!cashAccount) {
    throw createError({ statusCode: 500, message: 'Cash account (1000) not found. Please seed accounts first.' });
  }

  // Create posted journal entry
  const journalEntry = await createJournalEntry(db, {
    date: body.date,
    description: `Expense: ${body.description}`,
    reference: id,
    referenceType: 'expense',
    lines: [
      {
        accountId: body.accountId,
        debit: totalAmount,
        credit: 0,
        description: body.description,
      },
      {
        accountId: cashAccount.id,
        debit: 0,
        credit: totalAmount,
        description: body.description,
      },
    ],
    createdBy: session.user?.id,
    status: 'posted',
  });

  await db.insert(accountingTables.expenses).values({
    id,
    expenseNumber,
    accountId: body.accountId,
    categoryName: body.categoryName || null,
    supplierId: body.supplierId || null,
    description: body.description,
    amount,
    taxId: body.taxId || null,
    taxRate,
    taxAmount,
    totalAmount,
    date: body.date,
    paymentMethod: body.paymentMethod || null,
    reference: body.reference || null,
    status: 'recorded',
    notes: body.notes || null,
    journalEntryId: journalEntry.id,
    createdBy: session.user?.id,
    createdAt: now,
    updatedAt: now,
  });

  return { id, expenseNumber, totalAmount, journalEntryId: journalEntry.id };
});
