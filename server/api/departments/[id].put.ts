import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useHRDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  await db
    .update(hrTables.departments)
    .set({
      name: body.name,
      description: body.description || null,
      managerId: body.managerId || null,
      isActive: body.isActive ?? true,
      updatedAt: new Date(),
    })
    .where(eq(hrTables.departments.id, id));

  return { success: true };
});
