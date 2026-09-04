import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  const entry = await db
    .select()
    .from(accountingTables.journalEntries)
    .where(eq(accountingTables.journalEntries.id, id))
    .get();

  if (!entry) {
    throw createError({ statusCode: 404, message: 'Journal entry not found' });
  }

  if (entry.status !== 'draft') {
    throw createError({ statusCode: 400, message: 'Only draft entries can be edited' });
  }

  await db
    .update(accountingTables.journalEntries)
    .set({
      date: body.date ?? entry.date,
      description: body.description ?? entry.description,
      reference: body.reference !== undefined ? body.reference : entry.reference,
      notes: body.notes !== undefined ? body.notes : entry.notes,
      updatedAt: new Date(),
    })
    .where(eq(accountingTables.journalEntries.id, id));

  if (body.lines && Array.isArray(body.lines)) {
    const totalDebit = round2(body.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0));
    const totalCredit = round2(body.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0));

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw createError({
        statusCode: 400,
        message: `Debits (${totalDebit}) must equal credits (${totalCredit})`,
      });
    }

    await db
      .delete(accountingTables.journalEntryLines)
      .where(eq(accountingTables.journalEntryLines.journalEntryId, id));

    for (const line of body.lines) {
      await db.insert(accountingTables.journalEntryLines).values({
        id: generateId('jel'),
        journalEntryId: id,
        accountId: line.accountId,
        debit: round2(line.debit || 0),
        credit: round2(line.credit || 0),
        description: line.description || null,
      });
    }
  }

  return { success: true };
});
