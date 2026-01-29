import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  const updateData: Record<string, unknown> = {
    status: body.status,
    updatedAt: new Date(),
  };

  if (body.status === 'approved' || body.status === 'rejected') {
    updateData.approvedBy = body.approvedBy || null;
    updateData.approvedAt = new Date();
  }

  await db
    .update(tables.leaveRequests)
    .set(updateData)
    .where(eq(tables.leaveRequests.id, id));

  return { success: true };
});
