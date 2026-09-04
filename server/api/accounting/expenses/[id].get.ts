import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;

  const expense = await db.query.expenses.findFirst({
    where: eq(accountingTables.expenses.id, id),
    with: { account: true },
  });

  if (!expense) {
    throw createError({ statusCode: 404, message: 'Expense not found' });
  }

  return expense;
});
