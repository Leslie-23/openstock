export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const asOfDate = query.asOfDate as string || new Date().toISOString().split('T')[0];

  const rawDb = hubDatabase();

  const rows = await rawDb
    .prepare(`
      SELECT
        a.id as account_id,
        a.code,
        a.name,
        a.account_type,
        a.account_sub_type,
        a.normal_balance,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit
      FROM accounts a
      INNER JOIN journal_entry_lines jel ON jel.account_id = a.id
      INNER JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.status = 'posted'
        AND je.date <= ?
      WHERE a.account_type IN ('asset', 'liability', 'equity')
        AND a.is_active = 1
      GROUP BY a.id, a.code, a.name, a.account_type, a.account_sub_type, a.normal_balance
      ORDER BY a.code
    `)
    .bind(asOfDate)
    .all();

  // Calculate net income for retained earnings
  const plRows = await rawDb
    .prepare(`
      SELECT
        a.account_type,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit
      FROM accounts a
      INNER JOIN journal_entry_lines jel ON jel.account_id = a.id
      INNER JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.status = 'posted'
        AND je.date <= ?
      WHERE a.account_type IN ('revenue', 'expense')
      GROUP BY a.account_type
    `)
    .bind(asOfDate)
    .all();

  let netIncome = 0;
  for (const row of (plRows.results || []) as any[]) {
    if (row.account_type === 'revenue') {
      netIncome += row.total_credit - row.total_debit;
    } else {
      netIncome -= row.total_debit - row.total_credit;
    }
  }

  const assets: any[] = [];
  const liabilities: any[] = [];
  const equity: any[] = [];
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const row of (rows.results || []) as any[]) {
    const balance = round2(
      row.normal_balance === 'debit'
        ? row.total_debit - row.total_credit
        : row.total_credit - row.total_debit
    );

    const entry = {
      accountId: row.account_id,
      code: row.code,
      name: row.name,
      subType: row.account_sub_type,
      balance,
    };

    switch (row.account_type) {
      case 'asset':
        assets.push(entry);
        totalAssets += balance;
        break;
      case 'liability':
        liabilities.push(entry);
        totalLiabilities += balance;
        break;
      case 'equity':
        equity.push(entry);
        totalEquity += balance;
        break;
    }
  }

  totalEquity += round2(netIncome);

  return {
    assets: { accounts: assets, total: round2(totalAssets) },
    liabilities: { accounts: liabilities, total: round2(totalLiabilities) },
    equity: {
      accounts: [
        ...equity,
        { accountId: null, code: '', name: 'Net Income (Current Period)', subType: 'retainedEarnings', balance: round2(netIncome) },
      ],
      total: round2(totalEquity),
    },
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    asOfDate,
  };
});
