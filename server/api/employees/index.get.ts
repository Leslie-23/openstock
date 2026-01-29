import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();

  const employees = await db.query.employees.findMany({
    orderBy: [desc(tables.employees.createdAt)],
    with: {
      department: true,
    },
  });

  return employees;
});
