import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useHRDB();
  const id = getRouterParam(event, 'id')!;

  const period = await db.query.payrollPeriods.findFirst({
    where: eq(hrTables.payrollPeriods.id, id),
    with: {
      payrollRuns: {
        with: {
          employee: {
            with: {
              department: true,
            },
          },
        },
      },
    },
  });

  if (!period) {
    throw createError({ statusCode: 404, statusMessage: 'Payroll period not found' });
  }

  return period;
});
