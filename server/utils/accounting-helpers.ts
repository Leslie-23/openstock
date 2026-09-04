import { eq, sql, desc } from 'drizzle-orm';
import { accountingTables } from './accounting-db';

interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

interface CreateJournalEntryParams {
  date: string;
  description: string;
  reference?: string;
  referenceType?: string;
  lines: JournalLine[];
  createdBy?: string;
  status?: 'draft' | 'posted';
}

export async function createJournalEntry(
  db: ReturnType<typeof import('./accounting-db').useAccountingDB>,
  params: CreateJournalEntryParams
) {
  const { date, description, reference, referenceType, lines, createdBy, status = 'posted' } = params;

  if (lines.length < 2) {
    throw createError({ statusCode: 400, message: 'Journal entry must have at least 2 lines' });
  }

  const totalDebit = round2(lines.reduce((sum, l) => sum + (l.debit || 0), 0));
  const totalCredit = round2(lines.reduce((sum, l) => sum + (l.credit || 0), 0));

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw createError({
      statusCode: 400,
      message: `Debits (${totalDebit}) must equal credits (${totalCredit})`,
    });
  }

  const entryNumber = await getNextNumber(db, 'journal_entries', 'entry_number', 'JE');
  const entryId = generateId('je');
  const now = new Date();

  await db.insert(accountingTables.journalEntries).values({
    id: entryId,
    entryNumber,
    date,
    description,
    reference: reference || null,
    referenceType: referenceType as any || null,
    status,
    postedAt: status === 'posted' ? now : null,
    postedBy: status === 'posted' ? createdBy : null,
    createdBy: createdBy || null,
    createdAt: now,
    updatedAt: now,
  });

  for (const line of lines) {
    await db.insert(accountingTables.journalEntryLines).values({
      id: generateId('jel'),
      journalEntryId: entryId,
      accountId: line.accountId,
      debit: round2(line.debit || 0),
      credit: round2(line.credit || 0),
      description: line.description || null,
      createdAt: now,
    });
  }

  return { id: entryId, entryNumber };
}

export async function getNextNumber(
  db: any,
  tableName: string,
  columnName: string,
  prefix: string
): Promise<string> {
  const rawDb = hubDatabase();
  const result = await rawDb
    .prepare(`SELECT ${columnName} FROM ${tableName} WHERE ${columnName} LIKE '${prefix}-%' ORDER BY ${columnName} DESC LIMIT 1`)
    .first<Record<string, string>>();

  let nextNum = 1;
  if (result && result[columnName]) {
    const current = result[columnName];
    const numPart = current.split('-').pop();
    if (numPart) {
      nextNum = parseInt(numPart, 10) + 1;
    }
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
