import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;

  const record = await db.query.accountsReceivable.findFirst({
    where: eq(accountingTables.accountsReceivable.id, id),
    with: {
      customer: true,
      invoice: true,
    },
  });

  if (!record) {
    throw createError({ statusCode: 404, message: 'Accounts receivable record not found' });
  }

  return record;
});
