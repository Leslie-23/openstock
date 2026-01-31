export default defineEventHandler(async (event) => {
  const db = useFinanceDB();
  const body = await readBody(event);

  const id = generateId('fx');

  await db.insert(financeTables.forexTransactions).values({
    id,
    type: body.type, // 'buy' or 'sell'
    usdAmount: body.usdAmount,
    ghsAmount: body.ghsAmount,
    exchangeRate: body.exchangeRate,
    marketRate: body.marketRate,
    profitGHS: body.profitGHS || 0,
    customerName: body.customerName,
    reference: body.reference,
    status: body.status || 'completed',
    notes: body.notes,
  });

  // Also record in general transactions
  await db.insert(financeTables.transactions).values({
    id: generateId('txn'),
    type: body.type === 'sell' ? 'in' : 'out',
    businessLine: 'forex',
    description: `Forex ${body.type}: $${body.usdAmount} USD @ ${body.exchangeRate}`,
    amount: body.ghsAmount,
    currency: 'GHS',
    reference: body.reference,
  });

  return { id, success: true };
});
