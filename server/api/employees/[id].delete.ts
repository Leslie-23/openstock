import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useHRDB();
  const id = getRouterParam(event, 'id')!;

  await db.delete(hrTables.employees).where(eq(hrTables.employees.id, id));

  return { success: true };
});
