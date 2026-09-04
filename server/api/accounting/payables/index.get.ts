import { asc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();

  const records = await db.query.accountsPayable.findMany({
    with: {
      payments: true,
    },
    orderBy: [asc(accountingTables.accountsPayable.dueDate)],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const aging = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90plus: 0,
    totalOutstanding: 0,
  };

  const enrichedRecords = records.map((record) => {
    const dueDate = new Date(record.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - dueDate.getTime();
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const balance = record.balanceDue || 0;

    let agingBucket: string;
    if (daysOverdue <= 0) {
      agingBucket = 'current';
      aging.current = round2(aging.current + balance);
    } else if (daysOverdue <= 30) {
      agingBucket = '1-30';
      aging.days1to30 = round2(aging.days1to30 + balance);
    } else if (daysOverdue <= 60) {
      agingBucket = '31-60';
      aging.days31to60 = round2(aging.days31to60 + balance);
    } else if (daysOverdue <= 90) {
      agingBucket = '61-90';
      aging.days61to90 = round2(aging.days61to90 + balance);
    } else {
      agingBucket = '90+';
      aging.days90plus = round2(aging.days90plus + balance);
    }

    aging.totalOutstanding = round2(aging.totalOutstanding + balance);

    return {
      ...record,
      daysOverdue: Math.max(0, daysOverdue),
      agingBucket,
    };
  });

  return {
    records: enrichedRecords,
    summary: aging,
  };
});
