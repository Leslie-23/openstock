import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useHRDB();
  const id = getRouterParam(event, 'id')!;

  await db.delete(hrTables.departments).where(eq(hrTables.departments.id, id));

  return { success: true };
});
