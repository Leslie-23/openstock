import { eq, sql, and, lte, gte } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const query = getQuery(event);
  const startDate = query.startDate as string | undefined;
  const endDate = query.endDate as string | undefined;

  const rawDb = hubDatabase();

  let dateFilter = '';
  const params: any[] = [];
  if (startDate) {
    dateFilter += ' AND je.date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND je.date <= ?';
    params.push(endDate);
  }

  const rows = await rawDb
    .prepare(`
      SELECT
        a.id as account_id,
        a.code,
        a.name,
        a.account_type,
        a.normal_balance,
        COALESCE(SUM(jel.debit), 0) as total_debit,
        COALESCE(SUM(jel.credit), 0) as total_credit
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON jel.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted' ${dateFilter}
      WHERE a.is_active = 1
      GROUP BY a.id, a.code, a.name, a.account_type, a.normal_balance
      HAVING total_debit > 0 OR total_credit > 0
      ORDER BY a.code
    `)
    .bind(...params)
    .all();

  const accounts = (rows.results || []).map((row: any) => ({
    accountId: row.account_id,
    code: row.code,
    name: row.name,
    accountType: row.account_type,
    normalBalance: row.normal_balance,
    totalDebit: round2(row.total_debit),
    totalCredit: round2(row.total_credit),
    balance: round2(row.normal_balance === 'debit'
      ? row.total_debit - row.total_credit
      : row.total_credit - row.total_debit),
  }));

  const grandTotalDebit = round2(accounts.reduce((s: number, a: any) => s + a.totalDebit, 0));
  const grandTotalCredit = round2(accounts.reduce((s: number, a: any) => s + a.totalCredit, 0));

  return {
    accounts,
    totals: {
      debit: grandTotalDebit,
      credit: grandTotalCredit,
      isBalanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01,
    },
    filters: { startDate: startDate || null, endDate: endDate || null },
  };
});
