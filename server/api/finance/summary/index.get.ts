import { eq, sql, desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useFinanceDB();

  // Get totals per business line
  const allTransactions = await db.query.transactions.findMany();

  const summary = {
    appliance: { totalIn: 0, totalOut: 0, net: 0 },
    cross_border: { totalIn: 0, totalOut: 0, net: 0 },
    forex: { totalIn: 0, totalOut: 0, net: 0 },
    crypto: { totalIn: 0, totalOut: 0, net: 0 },
    overall: { totalIn: 0, totalOut: 0, net: 0 },
  };

  for (const txn of allTransactions) {
    const line = txn.businessLine as keyof typeof summary;
    if (summary[line]) {
      if (txn.type === 'in') {
        summary[line].totalIn += txn.amount;
        summary.overall.totalIn += txn.amount;
      } else {
        summary[line].totalOut += txn.amount;
        summary.overall.totalOut += txn.amount;
      }
    }
  }

  // Calculate nets
  for (const key of Object.keys(summary) as (keyof typeof summary)[]) {
    summary[key].net = summary[key].totalIn - summary[key].totalOut;
  }

  // Cross-border profit summary
  const cbTransactions = await db.query.crossBorderTransactions.findMany({
    orderBy: [desc(financeTables.crossBorderTransactions.createdAt)],
  });
  const crossBorderProfit = cbTransactions.reduce((sum, t) => sum + t.profitGHS, 0);

  // Forex profit summary
  const fxTransactions = await db.query.forexTransactions.findMany();
  const forexProfit = fxTransactions.reduce((sum, t) => sum + (t.profitGHS || 0), 0);

  // Crypto profit summary
  const cryTransactions = await db.query.cryptoTransactions.findMany();
  const cryptoProfit = cryTransactions.reduce((sum, t) => sum + (t.profitGHS || 0), 0);

  // Recent transactions (last 10)
  const recent = await db.query.transactions.findMany({
    orderBy: [desc(financeTables.transactions.createdAt)],
    limit: 10,
  });

  return {
    summary,
    profits: {
      crossBorder: crossBorderProfit,
      forex: forexProfit,
      crypto: cryptoProfit,
      total: crossBorderProfit + forexProfit + cryptoProfit,
    },
    recentTransactions: recent,
    counts: {
      crossBorder: cbTransactions.length,
      forex: fxTransactions.length,
      crypto: cryTransactions.length,
      total: allTransactions.length,
    },
  };
});
