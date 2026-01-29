import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id')!;

  await db.delete(tables.leaveTypes).where(eq(tables.leaveTypes.id, id));

  return { success: true };
});
