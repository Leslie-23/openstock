import { desc, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useHRDB();
  const query = getQuery(event);

  const records = await db.query.leaveRequests.findMany({
    where: query.employeeId
      ? eq(hrTables.leaveRequests.employeeId, query.employeeId as string)
      : undefined,
    orderBy: [desc(hrTables.leaveRequests.createdAt)],
    with: {
      employee: true,
      leaveType: true,
    },
  });

  return records;
});
