import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  await db
    .update(tables.attendance)
    .set({
      clockIn: body.clockIn,
      clockOut: body.clockOut,
      breakMinutes: body.breakMinutes || 0,
      overtimeMinutes: body.overtimeMinutes || 0,
      status: body.status,
      notes: body.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(tables.attendance.id, id));

  return { success: true };
});
