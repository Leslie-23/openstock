import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useHRDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  await db
    .update(hrTables.payrollPeriods)
    .set({
      name: body.name,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status || 'draft',
      processedBy: body.processedBy || null,
      processedAt: body.status === 'completed' ? new Date() : null,
      notes: body.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(hrTables.payrollPeriods.id, id));

  return { success: true };
});
