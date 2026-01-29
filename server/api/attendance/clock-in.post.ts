import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString().split('T')[1].substring(0, 5);

  // Check if already clocked in today
  const existing = await db.query.attendance.findFirst({
    where: and(
      eq(tables.attendance.employeeId, body.employeeId),
      eq(tables.attendance.date, today)
    ),
  });

  if (existing) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Already clocked in today',
    });
  }

  const id = generateId('att');

  await db.insert(tables.attendance).values({
    id,
    employeeId: body.employeeId,
    date: today,
    clockIn: now,
    status: 'present',
    notes: body.notes || null,
  });

  return { id, clockIn: now };
});
