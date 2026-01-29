import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString().split('T')[1].substring(0, 5);

  const existing = await db.query.attendance.findFirst({
    where: and(
      eq(tables.attendance.employeeId, body.employeeId),
      eq(tables.attendance.date, today)
    ),
  });

  if (!existing) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No clock-in record found for today',
    });
  }

  if (existing.clockOut) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Already clocked out today',
    });
  }

  // Calculate overtime (assuming 8-hour workday)
  let overtimeMinutes = 0;
  if (existing.clockIn) {
    const [inH, inM] = existing.clockIn.split(':').map(Number);
    const [outH, outM] = now.split(':').map(Number);
    const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - (existing.breakMinutes || 0);
    const standardMinutes = 8 * 60;
    if (totalMinutes > standardMinutes) {
      overtimeMinutes = totalMinutes - standardMinutes;
    }
  }

  await db
    .update(tables.attendance)
    .set({
      clockOut: now,
      overtimeMinutes,
      updatedAt: new Date(),
    })
    .where(eq(tables.attendance.id, existing.id));

  return { success: true, clockOut: now, overtimeMinutes };
});
