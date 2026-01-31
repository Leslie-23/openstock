import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useHRDB();

  const periods = await db.query.payrollPeriods.findMany({
    orderBy: [desc(hrTables.payrollPeriods.startDate)],
    with: {
      payrollRuns: {
        with: {
          employee: true,
        },
      },
    },
  });

  return periods;
});
