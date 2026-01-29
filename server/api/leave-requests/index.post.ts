export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  const id = generateId('lv');

  await db.insert(tables.leaveRequests).values({
    id,
    employeeId: body.employeeId,
    leaveTypeId: body.leaveTypeId,
    startDate: body.startDate,
    endDate: body.endDate,
    totalDays: body.totalDays,
    reason: body.reason || null,
    status: 'pending',
  });

  return { id };
});
