import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useHRDB();
  const id = getRouterParam(event, 'id')!;

  await db.delete(hrTables.leaveTypes).where(eq(hrTables.leaveTypes.id, id));

  return { success: true };
});
