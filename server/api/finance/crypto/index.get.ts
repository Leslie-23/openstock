import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useFinanceDB();

  const results = await db.query.cryptoTransactions.findMany({
    orderBy: [desc(financeTables.cryptoTransactions.createdAt)],
  });

  return results;
});
