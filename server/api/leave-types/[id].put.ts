import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  await db
    .update(tables.leaveTypes)
    .set({
      name: body.name,
      description: body.description || null,
      defaultDays: body.defaultDays || 0,
      isPaid: body.isPaid ?? true,
      color: body.color || '#6B7280',
      isActive: body.isActive ?? true,
    })
    .where(eq(tables.leaveTypes.id, id));

  return { success: true };
});
