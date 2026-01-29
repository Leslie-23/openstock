export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  const id = generateId('att');

  await db.insert(tables.attendance).values({
    id,
    employeeId: body.employeeId,
    date: body.date,
    clockIn: body.clockIn || null,
    clockOut: body.clockOut || null,
    breakMinutes: body.breakMinutes || 0,
    overtimeMinutes: body.overtimeMinutes || 0,
    status: body.status || 'present',
    notes: body.notes || null,
  });

  return { id };
});
