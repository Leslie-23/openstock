import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;

  const invoice = await db.query.invoices.findFirst({
    where: eq(accountingTables.invoices.id, id),
    with: {
      lines: true,
      payments: true,
      customer: true,
    },
  });

  if (!invoice) {
    throw createError({ statusCode: 404, message: 'Invoice not found' });
  }

  return invoice;
});
