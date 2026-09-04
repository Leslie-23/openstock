import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const mainDb = useDB();
  const body = await readBody(event);
  const session = await getUserSession(event);

  if (!body.customerId || !body.issueDate || !body.dueDate || !body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
    throw createError({ statusCode: 400, message: 'customerId, issueDate, dueDate, and at least one line are required' });
  }

  // Verify customer exists
  const customer = await db
    .select()
    .from(accountingTables.customers)
    .where(eq(accountingTables.customers.id, body.customerId))
    .get();

  if (!customer) {
    throw createError({ statusCode: 404, message: 'Customer not found' });
  }

  // Process lines and compute totals
  const processedLines = [];
  let subtotal = 0;
  let taxTotal = 0;

  for (let i = 0; i < body.lines.length; i++) {
    const line = body.lines[i];

    if (!line.description || !line.quantity || !line.unitPrice) {
      throw createError({ statusCode: 400, message: `Line ${i + 1}: description, quantity, and unitPrice are required` });
    }

    let taxRate = 0;
    let taxAmount = 0;

    if (line.taxId) {
      const tax = await mainDb
        .select()
        .from(tables.taxes)
        .where(eq(tables.taxes.id, line.taxId))
        .get();

      if (!tax) {
        throw createError({ statusCode: 404, message: `Line ${i + 1}: tax not found` });
      }

      taxRate = tax.rate;
      taxAmount = round2(line.quantity * line.unitPrice * (taxRate / 100));
    }

    const lineTotal = round2(line.quantity * line.unitPrice);

    processedLines.push({
      id: generateId('invl'),
      productId: line.productId || null,
      variantId: line.variantId || null,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxId: line.taxId || null,
      taxRate,
      taxAmount,
      lineTotal,
      sortOrder: i,
    });

    subtotal += lineTotal;
    taxTotal += taxAmount;
  }

  subtotal = round2(subtotal);
  taxTotal = round2(taxTotal);
  const total = round2(subtotal + taxTotal);

  const invoiceId = generateId('inv');
  const invoiceNumber = await getNextNumber(db, 'invoices', 'invoice_number', 'INV');
  const now = new Date();

  // Insert invoice header
  await db.insert(accountingTables.invoices).values({
    id: invoiceId,
    invoiceNumber,
    customerId: body.customerId,
    status: 'draft',
    issueDate: body.issueDate,
    dueDate: body.dueDate,
    subtotal,
    taxTotal,
    total,
    amountPaid: 0,
    currency: body.currency || 'GHS',
    notes: body.notes || null,
    terms: body.terms || null,
    createdBy: session.user?.id || null,
    createdAt: now,
    updatedAt: now,
  });

  // Insert invoice lines
  for (const line of processedLines) {
    await db.insert(accountingTables.invoiceLines).values({
      ...line,
      invoiceId,
      createdAt: now,
    });
  }

  return { id: invoiceId, invoiceNumber };
});
