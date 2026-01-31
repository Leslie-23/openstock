import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useHRDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  const updateData: Record<string, unknown> = {
    status: body.status,
    updatedAt: new Date(),
  };

  if (body.status === 'paid') {
    updateData.paidAt = new Date();
  }

  await db
    .update(hrTables.payrollRuns)
    .set(updateData)
    .where(eq(hrTables.payrollRuns.id, id));

  return { success: true };
});
