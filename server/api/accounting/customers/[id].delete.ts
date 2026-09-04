import { eq, count } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;

  const customer = await db
    .select()
    .from(accountingTables.customers)
    .where(eq(accountingTables.customers.id, id))
    .get();

  if (!customer) {
    throw createError({ statusCode: 404, message: 'Customer not found' });
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(accountingTables.invoices)
    .where(eq(accountingTables.invoices.customerId, id));

  if (total > 0) {
    // Soft-delete: deactivate instead of hard-deleting
    await db
      .update(accountingTables.customers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(accountingTables.customers.id, id));

    return { success: true, softDeleted: true };
  }

  await db
    .delete(accountingTables.customers)
    .where(eq(accountingTables.customers.id, id));

  return { success: true };
});
