import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;

  const customer = await db.query.customers.findFirst({
    where: eq(accountingTables.customers.id, id),
    with: { invoices: true },
  });

  if (!customer) {
    throw createError({ statusCode: 404, message: 'Customer not found' });
  }

  return customer;
});
