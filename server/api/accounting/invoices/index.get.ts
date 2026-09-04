import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const query = getQuery(event);
  const status = query.status as string | undefined;

  if (status) {
    const invoices = await db.query.invoices.findMany({
      where: eq(accountingTables.invoices.status, status as any),
      with: { customer: true },
      orderBy: [desc(accountingTables.invoices.issueDate)],
    });
    return invoices;
  }

  const invoices = await db.query.invoices.findMany({
    with: { customer: true },
    orderBy: [desc(accountingTables.invoices.issueDate)],
  });

  return invoices;
});
