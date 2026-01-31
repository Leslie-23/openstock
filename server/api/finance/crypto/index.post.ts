export default defineEventHandler(async (event) => {
  const db = useFinanceDB();
  const body = await readBody(event);

  const id = generateId('cry');

  await db.insert(financeTables.cryptoTransactions).values({
    id,
    type: body.type, // 'buy' or 'sell'
    coin: body.coin, // 'BTC', 'ETH', 'USDT', etc.
    coinAmount: body.coinAmount,
    unitPrice: body.unitPrice,
    totalGHS: body.totalGHS,
    buyPricePerUnit: body.buyPricePerUnit,
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
    businessLine: 'crypto',
    description: `Crypto ${body.type}: ${body.coinAmount} ${body.coin} @ GHS ${body.unitPrice}`,
    amount: body.totalGHS,
    currency: 'GHS',
    reference: body.reference,
  });

  return { id, success: true };
});
