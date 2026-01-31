import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useFinanceDB();
  const id = getRouterParam(event, 'id')!;

  await db.delete(financeTables.transactions).where(eq(financeTables.transactions.id, id));

  return { success: true };
});
