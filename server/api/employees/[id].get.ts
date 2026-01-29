import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id')!;

  const employee = await db.query.employees.findFirst({
    where: eq(tables.employees.id, id),
    with: {
      department: true,
      attendanceRecords: {
        orderBy: (att, { desc }) => [desc(att.date)],
        limit: 30,
      },
      leaveRequests: {
        orderBy: (lr, { desc }) => [desc(lr.createdAt)],
        with: {
          leaveType: true,
        },
      },
      payrollRuns: {
        orderBy: (pr, { desc }) => [desc(pr.createdAt)],
        limit: 12,
        with: {
          payrollPeriod: true,
        },
      },
    },
  });

  if (!employee) {
    throw createError({ statusCode: 404, statusMessage: 'Employee not found' });
  }

  return employee;
});
