export default defineEventHandler(async (event) => {
  const db = useHRDB();
  const body = await readBody(event);

  const id = generateId('pp');

  await db.insert(hrTables.payrollPeriods).values({
    id,
    name: body.name,
    startDate: body.startDate,
    endDate: body.endDate,
    status: 'draft',
    notes: body.notes || null,
  });

  return { id };
});
