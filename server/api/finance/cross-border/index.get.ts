import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useFinanceDB();

  const results = await db.query.crossBorderTransactions.findMany({
    orderBy: [desc(financeTables.crossBorderTransactions.createdAt)],
  });

  return results;
});
