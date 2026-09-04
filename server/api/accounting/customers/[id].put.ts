import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  const existing = await db
    .select()
    .from(accountingTables.customers)
    .where(eq(accountingTables.customers.id, id))
    .get();

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Customer not found' });
  }

  await db
    .update(accountingTables.customers)
    .set({
      name: body.name ?? existing.name,
      email: body.email !== undefined ? body.email : existing.email,
      phone: body.phone !== undefined ? body.phone : existing.phone,
      address: body.address !== undefined ? body.address : existing.address,
      city: body.city !== undefined ? body.city : existing.city,
      country: body.country !== undefined ? body.country : existing.country,
      taxId: body.taxId !== undefined ? body.taxId : existing.taxId,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      updatedAt: new Date(),
    })
    .where(eq(accountingTables.customers.id, id));

  return { success: true };
});
