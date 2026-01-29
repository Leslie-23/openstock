export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  const id = generateId('dept');

  await db.insert(tables.departments).values({
    id,
    name: body.name,
    description: body.description || null,
    managerId: body.managerId || null,
    isActive: true,
  });

  return { id };
});
