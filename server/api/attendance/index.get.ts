import { desc, eq, and, gte, lte } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const query = getQuery(event);

  const conditions = [];

  if (query.employeeId) {
    conditions.push(eq(tables.attendance.employeeId, query.employeeId as string));
  }
  if (query.date) {
    conditions.push(eq(tables.attendance.date, query.date as string));
  }
  if (query.from) {
    conditions.push(gte(tables.attendance.date, query.from as string));
  }
  if (query.to) {
    conditions.push(lte(tables.attendance.date, query.to as string));
  }

  const records = await db.query.attendance.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(tables.attendance.date)],
    with: {
      employee: true,
    },
  });

  return records;
});
