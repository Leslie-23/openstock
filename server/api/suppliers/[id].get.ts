import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Supplier ID is required' });
  }

  const supplier = await db
    .select()
    .from(tables.suppliers)
    .where(eq(tables.suppliers.id, id))
    .get();

  if (!supplier) {
    throw createError({ statusCode: 404, message: 'Supplier not found' });
  }

  return supplier;
});
