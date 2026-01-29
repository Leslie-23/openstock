import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  await db
    .update(tables.employees)
    .set({
      employeeCode: body.employeeCode || null,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone || null,
      dateOfBirth: body.dateOfBirth || null,
      gender: body.gender || null,
      address: body.address || null,
      city: body.city || null,
      postalCode: body.postalCode || null,
      country: body.country || 'France',
      departmentId: body.departmentId || null,
      position: body.position || null,
      employmentType: body.employmentType || 'full_time',
      hireDate: body.hireDate,
      terminationDate: body.terminationDate || null,
      baseSalary: body.baseSalary || 0,
      salaryFrequency: body.salaryFrequency || 'monthly',
      bankName: body.bankName || null,
      bankAccount: body.bankAccount || null,
      taxId: body.taxId || null,
      socialSecurityNumber: body.socialSecurityNumber || null,
      emergencyContactName: body.emergencyContactName || null,
      emergencyContactPhone: body.emergencyContactPhone || null,
      status: body.status || 'active',
      notes: body.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(tables.employees.id, id));

  return { success: true };
});
