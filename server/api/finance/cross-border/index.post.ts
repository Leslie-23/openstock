export default defineEventHandler(async (event) => {
  const db = useFinanceDB();
  const body = await readBody(event);

  const id = generateId('cb');

  // Calculate profit: receivedAmount (converted to GHS) - sentAmount (converted to GHS) - fees - otherCosts
  const fees = body.fees || 0;
  const otherCosts = body.otherCosts || 0;

  // If sending NGN and receiving GHS: profit = receivedAmount - (sentAmount / rate) - fees
  // If sending GHS and receiving NGN: profit = (receivedAmount / rate) - sentAmount - fees
  // The caller provides profitGHS directly since they know the conversion
  const profitGHS = body.profitGHS ?? 0;

  await db.insert(financeTables.crossBorderTransactions).values({
    id,
    direction: body.direction,
    description: body.description,
    sentAmount: body.sentAmount,
    sentCurrency: body.sentCurrency,
    receivedAmount: body.receivedAmount,
    receivedCurrency: body.receivedCurrency,
    exchangeRate: body.exchangeRate,
    fees,
    otherCosts,
    profitGHS,
    customerName: body.customerName,
    reference: body.reference,
    status: body.status || 'completed',
    notes: body.notes,
  });

  // Also record as a transaction in/out
  await db.insert(financeTables.transactions).values({
    id: generateId('txn'),
    type: 'in',
    businessLine: 'cross_border',
    description: `Cross-border: ${body.description}`,
    amount: profitGHS,
    currency: 'GHS',
    reference: body.reference,
    notes: `${body.direction} | Sent: ${body.sentAmount} ${body.sentCurrency} → Received: ${body.receivedAmount} ${body.receivedCurrency}`,
  });

  return { id, profitGHS, success: true };
});
