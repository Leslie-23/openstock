import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useHRDB();

  const employees = await db.query.employees.findMany({
    orderBy: [desc(hrTables.employees.createdAt)],
    with: {
      department: true,
    },
  });

  return employees;
});
