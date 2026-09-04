export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const body = await readBody(event);
  const session = await getUserSession(event);

  if (!body.date || !body.description || !body.lines || !Array.isArray(body.lines)) {
    throw createError({ statusCode: 400, message: 'date, description, and lines are required' });
  }

  const result = await createJournalEntry(db, {
    date: body.date,
    description: body.description,
    reference: body.reference,
    referenceType: body.referenceType || 'manual',
    lines: body.lines,
    createdBy: session.user?.id,
    status: body.status || 'draft',
  });

  return result;
});
