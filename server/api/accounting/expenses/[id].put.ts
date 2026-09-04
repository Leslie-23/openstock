import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  const expense = await db.query.expenses.findFirst({
    where: eq(accountingTables.expenses.id, id),
  });

  if (!expense) {
    throw createError({ statusCode: 404, message: 'Expense not found' });
  }

  if (expense.status !== 'recorded') {
    throw createError({
      statusCode: 400,
      message: 'Only recorded expenses can be updated',
    });
  }

  await db
    .update(accountingTables.expenses)
    .set({
      description: body.description ?? expense.description,
      categoryName: body.categoryName ?? expense.categoryName,
      notes: body.notes ?? expense.notes,
      reference: body.reference ?? expense.reference,
      updatedAt: new Date(),
    })
    .where(eq(accountingTables.expenses.id, id));

  return { success: true };
});
