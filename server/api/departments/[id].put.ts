import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  await db
    .update(tables.departments)
    .set({
      name: body.name,
      description: body.description || null,
      managerId: body.managerId || null,
      isActive: body.isActive ?? true,
      updatedAt: new Date(),
    })
    .where(eq(tables.departments.id, id));

  return { success: true };
});
