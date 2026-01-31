import {
  sqliteTable,
  text,
  integer,
  real,
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// HR DATABASE SCHEMA
// This schema lives in a separate database from the production/inventory DB
// to isolate HR & payroll data and prevent production DB crashes.
// ============================================================================

// ============================================================================
// DEPARTMENTS
// ============================================================================
export const departments = sqliteTable('departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  managerId: text('manager_id'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  manager: one(employees, {
    fields: [departments.managerId],
    references: [employees.id],
    relationName: 'departmentManager',
  }),
  employees: many(employees),
}));

// ============================================================================
// EMPLOYEES
// ============================================================================
export const employees = sqliteTable('employees', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  employeeCode: text('employee_code').unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  dateOfBirth: text('date_of_birth'),
  gender: text('gender', { enum: ['male', 'female', 'other'] }),
  address: text('address'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country').default('France'),
  departmentId: text('department_id').references(() => departments.id),
  position: text('position'),
  employmentType: text('employment_type', {
    enum: ['full_time', 'part_time', 'contract', 'intern'],
  })
    .notNull()
    .default('full_time'),
  hireDate: text('hire_date').notNull(),
  terminationDate: text('termination_date'),
  baseSalary: real('base_salary').default(0),
  salaryFrequency: text('salary_frequency', {
    enum: ['monthly', 'biweekly', 'weekly', 'hourly'],
  })
    .notNull()
    .default('monthly'),
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  taxId: text('employee_tax_id'),
  socialSecurityNumber: text('social_security_number'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  status: text('status', {
    enum: ['active', 'on_leave', 'suspended', 'terminated'],
  })
    .notNull()
    .default('active'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export const employeesRelations = relations(employees, ({ one, many }) => ({
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  attendanceRecords: many(attendance),
  leaveRequests: many(leaveRequests),
  payrollRuns: many(payrollRuns),
}));

// ============================================================================
// ATTENDANCE (Clock in / Clock out)
// ============================================================================
export const attendance = sqliteTable('attendance', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  clockIn: text('clock_in'),
  clockOut: text('clock_out'),
  breakMinutes: integer('break_minutes').default(0),
  overtimeMinutes: integer('overtime_minutes').default(0),
  status: text('status', {
    enum: ['present', 'absent', 'late', 'half_day', 'holiday', 'weekend'],
  })
    .notNull()
    .default('present'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export const attendanceRelations = relations(attendance, ({ one }) => ({
  employee: one(employees, {
    fields: [attendance.employeeId],
    references: [employees.id],
  }),
}));

// ============================================================================
// LEAVE TYPES
// ============================================================================
export const leaveTypes = sqliteTable('leave_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  defaultDays: integer('default_days').default(0),
  isPaid: integer('is_paid', { mode: 'boolean' }).default(true),
  color: text('color').default('#6B7280'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

// ============================================================================
// LEAVE REQUESTS
// ============================================================================
export const leaveRequests = sqliteTable('leave_requests', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  leaveTypeId: text('leave_type_id')
    .notNull()
    .references(() => leaveTypes.id),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  totalDays: real('total_days').notNull(),
  reason: text('reason'),
  status: text('status', {
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
  })
    .notNull()
    .default('pending'),
  approvedBy: text('approved_by'),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveRequests.employeeId],
    references: [employees.id],
  }),
  leaveType: one(leaveTypes, {
    fields: [leaveRequests.leaveTypeId],
    references: [leaveTypes.id],
  }),
}));

// ============================================================================
// PAYROLL PERIODS
// ============================================================================
export const payrollPeriods = sqliteTable('payroll_periods', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  status: text('status', {
    enum: ['draft', 'processing', 'completed', 'cancelled'],
  })
    .notNull()
    .default('draft'),
  processedBy: text('processed_by'),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export const payrollPeriodsRelations = relations(
  payrollPeriods,
  ({ many }) => ({
    payrollRuns: many(payrollRuns),
  })
);

// ============================================================================
// PAYROLL RUNS (per employee per period)
// ============================================================================
export const payrollRuns = sqliteTable('payroll_runs', {
  id: text('id').primaryKey(),
  payrollPeriodId: text('payroll_period_id')
    .notNull()
    .references(() => payrollPeriods.id, { onDelete: 'cascade' }),
  employeeId: text('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  baseSalary: real('base_salary').notNull(),
  workedDays: real('worked_days').default(0),
  overtimeHours: real('overtime_hours').default(0),
  overtimePay: real('overtime_pay').default(0),
  bonuses: real('bonuses').default(0),
  bonusNotes: text('bonus_notes'),
  deductions: real('deductions').default(0),
  deductionNotes: text('deduction_notes'),
  taxAmount: real('tax_amount').default(0),
  socialSecurity: real('social_security').default(0),
  healthInsurance: real('health_insurance').default(0),
  otherDeductions: real('other_deductions').default(0),
  otherDeductionNotes: text('other_deduction_notes'),
  grossPay: real('gross_pay').notNull(),
  netPay: real('net_pay').notNull(),
  status: text('status', {
    enum: ['pending', 'approved', 'paid', 'cancelled'],
  })
    .notNull()
    .default('pending'),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(
    () => new Date()
  ),
});

export const payrollRunsRelations = relations(payrollRuns, ({ one }) => ({
  payrollPeriod: one(payrollPeriods, {
    fields: [payrollRuns.payrollPeriodId],
    references: [payrollPeriods.id],
  }),
  employee: one(employees, {
    fields: [payrollRuns.employeeId],
    references: [employees.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

export type LeaveType = typeof leaveTypes.$inferSelect;
export type NewLeaveType = typeof leaveTypes.$inferInsert;

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type NewLeaveRequest = typeof leaveRequests.$inferInsert;

export type PayrollPeriod = typeof payrollPeriods.$inferSelect;
export type NewPayrollPeriod = typeof payrollPeriods.$inferInsert;

export type PayrollRun = typeof payrollRuns.$inferSelect;
export type NewPayrollRun = typeof payrollRuns.$inferInsert;
