import { eq } from 'drizzle-orm';

const DEFAULT_ACCOUNTS = [
  // Assets (1xxx)
  { code: '1000', name: 'Cash', accountType: 'asset', accountSubType: 'cash', normalBalance: 'debit' },
  { code: '1010', name: 'Bank Account', accountType: 'asset', accountSubType: 'bank', normalBalance: 'debit' },
  { code: '1020', name: 'Mobile Money', accountType: 'asset', accountSubType: 'bank', normalBalance: 'debit' },
  { code: '1100', name: 'Accounts Receivable', accountType: 'asset', accountSubType: 'receivable', normalBalance: 'debit' },
  { code: '1200', name: 'Inventory', accountType: 'asset', accountSubType: 'inventory', normalBalance: 'debit' },
  { code: '1300', name: 'Prepaid Expenses', accountType: 'asset', accountSubType: 'otherCurrentAsset', normalBalance: 'debit' },

  // Liabilities (2xxx)
  { code: '2000', name: 'Accounts Payable', accountType: 'liability', accountSubType: 'payable', normalBalance: 'credit' },
  { code: '2100', name: 'Tax Payable (VAT/GST)', accountType: 'liability', accountSubType: 'taxPayable', normalBalance: 'credit' },
  { code: '2200', name: 'Wages Payable', accountType: 'liability', accountSubType: 'payable', normalBalance: 'credit' },
  { code: '2300', name: 'Accrued Expenses', accountType: 'liability', accountSubType: 'otherCurrentLiability', normalBalance: 'credit' },

  // Equity (3xxx)
  { code: '3000', name: "Owner's Equity", accountType: 'equity', accountSubType: 'ownersEquity', normalBalance: 'credit' },
  { code: '3100', name: 'Retained Earnings', accountType: 'equity', accountSubType: 'retainedEarnings', normalBalance: 'credit' },

  // Revenue (4xxx)
  { code: '4000', name: 'Sales Revenue', accountType: 'revenue', accountSubType: 'sales', normalBalance: 'credit' },
  { code: '4100', name: 'Service Revenue', accountType: 'revenue', accountSubType: 'sales', normalBalance: 'credit' },
  { code: '4200', name: 'Forex Income', accountType: 'revenue', accountSubType: 'otherIncome', normalBalance: 'credit' },
  { code: '4300', name: 'Cross-Border Income', accountType: 'revenue', accountSubType: 'otherIncome', normalBalance: 'credit' },
  { code: '4400', name: 'Crypto Trading Income', accountType: 'revenue', accountSubType: 'otherIncome', normalBalance: 'credit' },
  { code: '4500', name: 'Other Income', accountType: 'revenue', accountSubType: 'otherIncome', normalBalance: 'credit' },

  // Expenses (5xxx-6xxx)
  { code: '5000', name: 'Cost of Goods Sold', accountType: 'expense', accountSubType: 'cogs', normalBalance: 'debit' },
  { code: '6000', name: 'Salary & Wages', accountType: 'expense', accountSubType: 'operatingExpense', normalBalance: 'debit' },
  { code: '6100', name: 'Rent', accountType: 'expense', accountSubType: 'operatingExpense', normalBalance: 'debit' },
  { code: '6200', name: 'Utilities', accountType: 'expense', accountSubType: 'operatingExpense', normalBalance: 'debit' },
  { code: '6300', name: 'Office Supplies', accountType: 'expense', accountSubType: 'operatingExpense', normalBalance: 'debit' },
  { code: '6400', name: 'Marketing & Advertising', accountType: 'expense', accountSubType: 'operatingExpense', normalBalance: 'debit' },
  { code: '6500', name: 'Transport & Delivery', accountType: 'expense', accountSubType: 'operatingExpense', normalBalance: 'debit' },
  { code: '6600', name: 'Bank Charges & Fees', accountType: 'expense', accountSubType: 'operatingExpense', normalBalance: 'debit' },
  { code: '6700', name: 'Insurance', accountType: 'expense', accountSubType: 'operatingExpense', normalBalance: 'debit' },
  { code: '6800', name: 'Depreciation', accountType: 'expense', accountSubType: 'operatingExpense', normalBalance: 'debit' },
  { code: '6900', name: 'Miscellaneous Expense', accountType: 'expense', accountSubType: 'operatingExpense', normalBalance: 'debit' },
] as const;

export default defineEventHandler(async () => {
  const db = useAccountingDB();
  const now = new Date();
  let created = 0;
  let skipped = 0;

  for (const acct of DEFAULT_ACCOUNTS) {
    const existing = await db
      .select({ id: accountingTables.accounts.id })
      .from(accountingTables.accounts)
      .where(eq(accountingTables.accounts.code, acct.code))
      .get();

    if (existing) {
      skipped++;
      continue;
    }

    await db.insert(accountingTables.accounts).values({
      id: generateId('acct'),
      code: acct.code,
      name: acct.name,
      accountType: acct.accountType as any,
      accountSubType: acct.accountSubType as any,
      normalBalance: acct.normalBalance as any,
      isActive: true,
      isSystemAccount: true,
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }

  return {
    success: true,
    message: `Chart of Accounts seeded: ${created} created, ${skipped} already existed`,
    total: DEFAULT_ACCOUNTS.length,
    created,
    skipped,
  };
});
