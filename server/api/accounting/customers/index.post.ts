export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const body = await readBody(event);

  if (!body.name) {
    throw createError({ statusCode: 400, message: 'name is required' });
  }

  const id = generateId('cust');
  const now = new Date();

  await db.insert(accountingTables.customers).values({
    id,
    name: body.name,
    email: body.email || null,
    phone: body.phone || null,
    address: body.address || null,
    city: body.city || null,
    country: body.country || null,
    taxId: body.taxId || null,
    notes: body.notes || null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  return { id };
});
