import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;
  const session = await getUserSession(event);

  const entry = await db
    .select()
    .from(accountingTables.journalEntries)
    .where(eq(accountingTables.journalEntries.id, id))
    .get();

  if (!entry) {
    throw createError({ statusCode: 404, message: 'Journal entry not found' });
  }

  if (entry.status !== 'draft') {
    throw createError({ statusCode: 400, message: 'Only draft entries can be posted' });
  }

  const lines = await db
    .select()
    .from(accountingTables.journalEntryLines)
    .where(eq(accountingTables.journalEntryLines.journalEntryId, id));

  if (lines.length < 2) {
    throw createError({ statusCode: 400, message: 'Journal entry must have at least 2 lines to post' });
  }

  const totalDebit = round2(lines.reduce((s, l) => s + (l.debit || 0), 0));
  const totalCredit = round2(lines.reduce((s, l) => s + (l.credit || 0), 0));

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw createError({
      statusCode: 400,
      message: `Cannot post: debits (${totalDebit}) do not equal credits (${totalCredit})`,
    });
  }

  await db
    .update(accountingTables.journalEntries)
    .set({
      status: 'posted',
      postedAt: new Date(),
      postedBy: session.user?.id || null,
      updatedAt: new Date(),
    })
    .where(eq(accountingTables.journalEntries.id, id));

  return { success: true };
});
