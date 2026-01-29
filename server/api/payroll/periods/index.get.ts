import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();

  const periods = await db.query.payrollPeriods.findMany({
    orderBy: [desc(tables.payrollPeriods.startDate)],
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
