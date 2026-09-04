export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const startDate = query.startDate as string || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const endDate = query.endDate as string || new Date().toISOString().split('T')[0];

  const rawDb = hubDatabase();

  const rows = await rawDb
    .prepare(`
      SELECT
        a.id as account_id,
        a.code,
        a.name,
        a.account_type,
        a.account_sub_type,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit
      FROM accounts a
      INNER JOIN journal_entry_lines jel ON jel.account_id = a.id
      INNER JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.status = 'posted'
        AND je.date >= ?
        AND je.date <= ?
      WHERE a.account_type IN ('revenue', 'expense')
        AND a.is_active = 1
      GROUP BY a.id, a.code, a.name, a.account_type, a.account_sub_type
      ORDER BY a.account_type DESC, a.code
    `)
    .bind(startDate, endDate)
    .all();

  const revenueAccounts: any[] = [];
  const expenseAccounts: any[] = [];
  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const row of (rows.results || []) as any[]) {
    const amount = round2(
      row.account_type === 'revenue'
        ? row.total_credit - row.total_debit
        : row.total_debit - row.total_credit
    );

    const entry = {
      accountId: row.account_id,
      code: row.code,
      name: row.name,
      subType: row.account_sub_type,
      amount,
    };

    if (row.account_type === 'revenue') {
      revenueAccounts.push(entry);
      totalRevenue += amount;
    } else {
      expenseAccounts.push(entry);
      totalExpenses += amount;
    }
  }

  return {
    revenue: { accounts: revenueAccounts, total: round2(totalRevenue) },
    expenses: { accounts: expenseAccounts, total: round2(totalExpenses) },
    netIncome: round2(totalRevenue - totalExpenses),
    period: { startDate, endDate },
  };
});
