export default defineEventHandler(async (event) => {
  const db = useHRDB();
  const body = await readBody(event);

  const id = generateId('lvt');

  await db.insert(hrTables.leaveTypes).values({
    id,
    name: body.name,
    description: body.description || null,
    defaultDays: body.defaultDays || 0,
    isPaid: body.isPaid ?? true,
    color: body.color || '#6B7280',
    isActive: true,
  });

  return { id };
});
