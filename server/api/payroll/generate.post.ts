import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useHRDB();
  const body = await readBody(event);

  const periodId = body.payrollPeriodId;

  // Get all active employees
  const activeEmployees = await db.query.employees.findMany({
    where: eq(hrTables.employees.status, 'active'),
  });

  const runs = [];

  for (const emp of activeEmployees) {
    const id = generateId('pr');
    const baseSalary = emp.baseSalary || 0;

    // Default deduction rates (configurable later)
    const taxRate = 0.15;
    const socialSecurityRate = 0.08;
    const healthInsuranceRate = 0.03;

    const grossPay = baseSalary;
    const taxAmount = grossPay * taxRate;
    const socialSecurity = grossPay * socialSecurityRate;
    const healthInsurance = grossPay * healthInsuranceRate;
    const totalDeductions = taxAmount + socialSecurity + healthInsurance;
    const netPay = grossPay - totalDeductions;

    await db.insert(hrTables.payrollRuns).values({
      id,
      payrollPeriodId: periodId,
      employeeId: emp.id,
      baseSalary,
      workedDays: body.workingDays || 22,
      overtimeHours: 0,
      overtimePay: 0,
      bonuses: 0,
      deductions: 0,
      taxAmount,
      socialSecurity,
      healthInsurance,
      otherDeductions: 0,
      grossPay,
      netPay,
      status: 'pending',
    });

    runs.push({ id, employeeId: emp.id, grossPay, netPay });
  }

  // Mark period as processing
  await db
    .update(hrTables.payrollPeriods)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(hrTables.payrollPeriods.id, periodId));

  return { generated: runs.length, runs };
});
