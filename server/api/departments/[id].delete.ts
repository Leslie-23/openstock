import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id')!;

  await db.delete(tables.departments).where(eq(tables.departments.id, id));

  return { success: true };
});
