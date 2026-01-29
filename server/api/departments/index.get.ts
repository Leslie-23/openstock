import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();

  const departments = await db.query.departments.findMany({
    orderBy: [desc(tables.departments.createdAt)],
  });

  return departments;
});
