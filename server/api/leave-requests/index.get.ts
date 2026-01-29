import { desc, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const query = getQuery(event);

  const records = await db.query.leaveRequests.findMany({
    where: query.employeeId
      ? eq(tables.leaveRequests.employeeId, query.employeeId as string)
      : undefined,
    orderBy: [desc(tables.leaveRequests.createdAt)],
    with: {
      employee: true,
      leaveType: true,
    },
  });

  return records;
});
