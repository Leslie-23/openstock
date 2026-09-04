import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;
  const session = await getUserSession(event);

  const invoice = await db.query.invoices.findFirst({
    where: eq(accountingTables.invoices.id, id),
  });

  if (!invoice) {
    throw createError({ statusCode: 404, message: 'Invoice not found' });
  }

  if (invoice.status === 'void') {
    throw createError({ statusCode: 400, message: 'Invoice is already voided' });
  }

  const now = new Date();

  // If the invoice has a journal entry, void it and create a reversing entry
  if (invoice.journalEntryId) {
    const journalEntry = await db.query.journalEntries.findFirst({
      where: eq(accountingTables.journalEntries.id, invoice.journalEntryId),
      with: { lines: true },
    });

    if (journalEntry && journalEntry.status === 'posted') {
      // Create reversing entry
      const reversingLines = journalEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: line.credit || 0,
        credit: line.debit || 0,
        description: `Reversal: ${line.description || ''}`.trim(),
      }));

      await createJournalEntry(db, {
        date: new Date().toISOString().split('T')[0],
        description: `Void reversal of invoice ${invoice.invoiceNumber}`,
        reference: invoice.id,
        referenceType: 'invoice',
        lines: reversingLines,
        createdBy: session.user?.id,
        status: 'posted',
      });

      // Mark original journal entry as voided
      await db
        .update(accountingTables.journalEntries)
        .set({ status: 'voided', updatedAt: now })
        .where(eq(accountingTables.journalEntries.id, invoice.journalEntryId));
    }
  }

  // Update AR record if exists
  const arRecord = await db
    .select()
    .from(accountingTables.accountsReceivable)
    .where(eq(accountingTables.accountsReceivable.invoiceId, id))
    .get();

  if (arRecord) {
    await db
      .update(accountingTables.accountsReceivable)
      .set({ status: 'written_off', updatedAt: now })
      .where(eq(accountingTables.accountsReceivable.id, arRecord.id));
  }

  // Set invoice status to void
  await db
    .update(accountingTables.invoices)
    .set({ status: 'void', updatedAt: now })
    .where(eq(accountingTables.invoices.id, id));

  return { success: true };
});
