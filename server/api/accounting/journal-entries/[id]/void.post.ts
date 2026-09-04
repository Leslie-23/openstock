import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;
  const session = await getUserSession(event);

  const entry = await db.query.journalEntries.findFirst({
    where: eq(accountingTables.journalEntries.id, id),
    with: { lines: true },
  });

  if (!entry) {
    throw createError({ statusCode: 404, message: 'Journal entry not found' });
  }

  if (entry.status !== 'posted') {
    throw createError({ statusCode: 400, message: 'Only posted entries can be voided' });
  }

  // Create reversing entry
  const reversingLines = entry.lines.map((line) => ({
    accountId: line.accountId,
    debit: line.credit || 0,
    credit: line.debit || 0,
    description: `Reversal: ${line.description || ''}`.trim(),
  }));

  await createJournalEntry(db, {
    date: new Date().toISOString().split('T')[0],
    description: `Void reversal of ${entry.entryNumber}: ${entry.description}`,
    reference: entry.id,
    referenceType: 'manual',
    lines: reversingLines,
    createdBy: session.user?.id,
    status: 'posted',
  });

  // Mark original as voided
  await db
    .update(accountingTables.journalEntries)
    .set({ status: 'voided', updatedAt: new Date() })
    .where(eq(accountingTables.journalEntries.id, id));

  return { success: true };
});
