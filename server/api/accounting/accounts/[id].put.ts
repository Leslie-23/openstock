import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  const existing = await db
    .select()
    .from(accountingTables.accounts)
    .where(eq(accountingTables.accounts.id, id))
    .get();

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Account not found' });
  }

  await db
    .update(accountingTables.accounts)
    .set({
      name: body.name ?? existing.name,
      description: body.description !== undefined ? body.description : existing.description,
      accountSubType: body.accountSubType !== undefined ? body.accountSubType : existing.accountSubType,
      parentId: body.parentId !== undefined ? body.parentId : existing.parentId,
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      updatedAt: new Date(),
    })
    .where(eq(accountingTables.accounts.id, id));

  return { success: true };
});
