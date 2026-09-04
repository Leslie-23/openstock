import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const query = getQuery(event);
  const accountType = query.type as string | undefined;

  let accounts;
  if (accountType) {
    accounts = await db
      .select()
      .from(accountingTables.accounts)
      .where(eq(accountingTables.accounts.accountType, accountType as any))
      .orderBy(accountingTables.accounts.code);
  } else {
    accounts = await db
      .select()
      .from(accountingTables.accounts)
      .orderBy(accountingTables.accounts.code);
  }

  return accounts;
});
