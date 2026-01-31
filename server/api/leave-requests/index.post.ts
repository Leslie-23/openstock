export default defineEventHandler(async (event) => {
  const db = useHRDB();
  const body = await readBody(event);

  const id = generateId('lv');

  await db.insert(hrTables.leaveRequests).values({
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
