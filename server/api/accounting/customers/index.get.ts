export default defineEventHandler(async (event) => {
  const db = useAccountingDB();

  const customers = await db
    .select()
    .from(accountingTables.customers)
    .orderBy(accountingTables.customers.name);

  return customers;
});
