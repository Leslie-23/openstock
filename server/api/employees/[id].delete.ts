import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id')!;

  await db.delete(tables.employees).where(eq(tables.employees.id, id));

  return { success: true };
});
