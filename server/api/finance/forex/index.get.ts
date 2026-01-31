import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useFinanceDB();

  const results = await db.query.forexTransactions.findMany({
    orderBy: [desc(financeTables.forexTransactions.createdAt)],
  });

  return results;
});
