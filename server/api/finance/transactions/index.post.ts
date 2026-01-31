export default defineEventHandler(async (event) => {
  const db = useFinanceDB();
  const body = await readBody(event);

  const id = generateId('txn');

  await db.insert(financeTables.transactions).values({
    id,
    type: body.type,
    businessLine: body.businessLine,
    description: body.description,
    amount: body.amount,
    currency: body.currency || 'GHS',
    reference: body.reference,
    notes: body.notes,
  });

  return { id, success: true };
});
