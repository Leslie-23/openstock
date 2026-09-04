import { desc, eq, and, gte, lte } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const query = getQuery(event);

  const entries = await db.query.journalEntries.findMany({
    orderBy: [desc(accountingTables.journalEntries.date)],
    with: {
      lines: {
        with: {
          account: true,
        },
      },
    },
  });

  let filtered = entries;

  if (query.status) {
    filtered = filtered.filter((e) => e.status === query.status);
  }
  if (query.referenceType) {
    filtered = filtered.filter((e) => e.referenceType === query.referenceType);
  }
  if (query.startDate) {
    filtered = filtered.filter((e) => e.date >= (query.startDate as string));
  }
  if (query.endDate) {
    filtered = filtered.filter((e) => e.date <= (query.endDate as string));
  }

  return filtered;
});
