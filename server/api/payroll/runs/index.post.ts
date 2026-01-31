export default defineEventHandler(async (event) => {
  const db = useHRDB();
  const body = await readBody(event);

  const id = generateId('pr');

  const grossPay =
    (body.baseSalary || 0) +
    (body.overtimePay || 0) +
    (body.bonuses || 0);

  const totalDeductions =
    (body.deductions || 0) +
    (body.taxAmount || 0) +
    (body.socialSecurity || 0) +
    (body.healthInsurance || 0) +
    (body.otherDeductions || 0);

  const netPay = grossPay - totalDeductions;

  await db.insert(hrTables.payrollRuns).values({
    id,
    payrollPeriodId: body.payrollPeriodId,
    employeeId: body.employeeId,
    baseSalary: body.baseSalary,
    workedDays: body.workedDays || 0,
    overtimeHours: body.overtimeHours || 0,
    overtimePay: body.overtimePay || 0,
    bonuses: body.bonuses || 0,
    bonusNotes: body.bonusNotes || null,
    deductions: body.deductions || 0,
    deductionNotes: body.deductionNotes || null,
    taxAmount: body.taxAmount || 0,
    socialSecurity: body.socialSecurity || 0,
    healthInsurance: body.healthInsurance || 0,
    otherDeductions: body.otherDeductions || 0,
    otherDeductionNotes: body.otherDeductionNotes || null,
    grossPay,
    netPay,
    status: 'pending',
  });

  return { id, grossPay, netPay };
});
