export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const body = await readBody(event);

  if (!body.code || !body.name || !body.accountType || !body.normalBalance) {
    throw createError({ statusCode: 400, message: 'code, name, accountType, and normalBalance are required' });
  }

  const id = generateId('acct');

  await db.insert(accountingTables.accounts).values({
    id,
    code: body.code,
    name: body.name,
    accountType: body.accountType,
    accountSubType: body.accountSubType || null,
    parentId: body.parentId || null,
    description: body.description || null,
    normalBalance: body.normalBalance,
    isActive: true,
    isSystemAccount: false,
  });

  return { id };
});
