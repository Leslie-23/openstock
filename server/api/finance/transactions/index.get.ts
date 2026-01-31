import { desc, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useFinanceDB();
  const query = getQuery(event);
  const businessLine = query.businessLine as string | undefined;

  let results;
  if (businessLine) {
    results = await db.query.transactions.findMany({
      where: eq(financeTables.transactions.businessLine, businessLine),
      orderBy: [desc(financeTables.transactions.createdAt)],
    });
  } else {
    results = await db.query.transactions.findMany({
      orderBy: [desc(financeTables.transactions.createdAt)],
    });
  }

  return results;
});
