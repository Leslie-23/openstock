import { eq, count } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;

  const account = await db
    .select()
    .from(accountingTables.accounts)
    .where(eq(accountingTables.accounts.id, id))
    .get();

  if (!account) {
    throw createError({ statusCode: 404, message: 'Account not found' });
  }

  if (account.isSystemAccount) {
    throw createError({ statusCode: 400, message: 'System accounts cannot be deleted' });
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(accountingTables.journalEntryLines)
    .where(eq(accountingTables.journalEntryLines.accountId, id));

  if (total > 0) {
    throw createError({ statusCode: 400, message: 'Cannot delete account with existing journal entries. Deactivate it instead.' });
  }

  await db
    .delete(accountingTables.accounts)
    .where(eq(accountingTables.accounts.id, id));

  return { success: true };
});
