import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;
  const session = await getUserSession(event);

  const expense = await db.query.expenses.findFirst({
    where: eq(accountingTables.expenses.id, id),
  });

  if (!expense) {
    throw createError({ statusCode: 404, message: 'Expense not found' });
  }

  if (expense.status === 'voided') {
    throw createError({ statusCode: 400, message: 'Expense is already voided' });
  }

  // If there is a journal entry, void it and create a reversing entry
  if (expense.journalEntryId) {
    const entry = await db.query.journalEntries.findFirst({
      where: eq(accountingTables.journalEntries.id, expense.journalEntryId),
      with: { lines: true },
    });

    if (entry && entry.status === 'posted') {
      // Create reversing entry
      const reversingLines = entry.lines.map((line) => ({
        accountId: line.accountId,
        debit: line.credit || 0,
        credit: line.debit || 0,
        description: `Reversal: ${line.description || ''}`.trim(),
      }));

      await createJournalEntry(db, {
        date: new Date().toISOString().split('T')[0],
        description: `Void reversal of expense ${expense.expenseNumber}: ${expense.description}`,
        reference: expense.journalEntryId,
        referenceType: 'expense',
        lines: reversingLines,
        createdBy: session.user?.id,
        status: 'posted',
      });

      // Mark original journal entry as voided
      await db
        .update(accountingTables.journalEntries)
        .set({ status: 'voided', updatedAt: new Date() })
        .where(eq(accountingTables.journalEntries.id, expense.journalEntryId));
    }
  }

  // Mark expense as voided
  await db
    .update(accountingTables.expenses)
    .set({ status: 'voided', updatedAt: new Date() })
    .where(eq(accountingTables.expenses.id, id));

  return { success: true };
});
