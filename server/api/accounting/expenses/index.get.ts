import { eq, desc, ne } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const query = getQuery(event);
  const includeVoided = query.includeVoided === 'true';

  const expenses = await db.query.expenses.findMany({
    where: includeVoided
      ? undefined
      : ne(accountingTables.expenses.status, 'voided'),
    with: { account: true },
    orderBy: [desc(accountingTables.expenses.date)],
  });

  return expenses;
});
