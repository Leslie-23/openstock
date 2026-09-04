import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const accountId = query.accountId as string;

  if (!accountId) {
    throw createError({ statusCode: 400, message: 'accountId is required' });
  }

  const db = useAccountingDB();

  const account = await db
    .select()
    .from(accountingTables.accounts)
    .where(eq(accountingTables.accounts.id, accountId))
    .get();

  if (!account) {
    throw createError({ statusCode: 404, message: 'Account not found' });
  }

  const startDate = query.startDate as string | undefined;
  const endDate = query.endDate as string | undefined;

  const rawDb = hubDatabase();
  let dateFilter = '';
  const params: any[] = [accountId];

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
        je.id as entry_id,
        je.entry_number,
        je.date,
        je.description as entry_description,
        je.reference_type,
        jel.debit,
        jel.credit,
        jel.description as line_description
      FROM journal_entry_lines jel
      INNER JOIN journal_entries je ON je.id = jel.journal_entry_id
        AND je.status = 'posted' ${dateFilter}
      WHERE jel.account_id = ?
      ORDER BY je.date, je.entry_number
    `)
    .bind(...params, accountId)
    .all();

  let runningBalance = 0;
  const entries = ((rows.results || []) as any[]).map((row) => {
    if (account.normalBalance === 'debit') {
      runningBalance += (row.debit || 0) - (row.credit || 0);
    } else {
      runningBalance += (row.credit || 0) - (row.debit || 0);
    }

    return {
      entryId: row.entry_id,
      entryNumber: row.entry_number,
      date: row.date,
      description: row.line_description || row.entry_description,
      referenceType: row.reference_type,
      debit: round2(row.debit || 0),
      credit: round2(row.credit || 0),
      balance: round2(runningBalance),
    };
  });

  return {
    account: {
      id: account.id,
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      normalBalance: account.normalBalance,
    },
    entries,
    closingBalance: round2(runningBalance),
    filters: { startDate: startDate || null, endDate: endDate || null },
  };
});
