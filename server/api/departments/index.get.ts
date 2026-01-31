import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useHRDB();

  const departments = await db.query.departments.findMany({
    orderBy: [desc(hrTables.departments.createdAt)],
  });

  return departments;
});
