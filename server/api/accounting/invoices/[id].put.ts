import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const mainDb = useDB();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  const existing = await db
    .select()
    .from(accountingTables.invoices)
    .where(eq(accountingTables.invoices.id, id))
    .get();

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Invoice not found' });
  }

  if (existing.status !== 'draft') {
    throw createError({ statusCode: 400, message: 'Only draft invoices can be updated' });
  }

  const now = new Date();

  // If lines are provided, recompute totals
  if (body.lines && Array.isArray(body.lines) && body.lines.length > 0) {
    // Delete old lines
    await db
      .delete(accountingTables.invoiceLines)
      .where(eq(accountingTables.invoiceLines.invoiceId, id));

    // Process new lines
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

      await db.insert(accountingTables.invoiceLines).values({
        id: generateId('invl'),
        invoiceId: id,
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
        createdAt: now,
      });

      subtotal += lineTotal;
      taxTotal += taxAmount;
    }

    subtotal = round2(subtotal);
    taxTotal = round2(taxTotal);
    const total = round2(subtotal + taxTotal);

    await db
      .update(accountingTables.invoices)
      .set({
        customerId: body.customerId ?? existing.customerId,
        issueDate: body.issueDate ?? existing.issueDate,
        dueDate: body.dueDate ?? existing.dueDate,
        subtotal,
        taxTotal,
        total,
        currency: body.currency ?? existing.currency,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        terms: body.terms !== undefined ? body.terms : existing.terms,
        updatedAt: now,
      })
      .where(eq(accountingTables.invoices.id, id));
  } else {
    // Update header fields only
    await db
      .update(accountingTables.invoices)
      .set({
        customerId: body.customerId ?? existing.customerId,
        issueDate: body.issueDate ?? existing.issueDate,
        dueDate: body.dueDate ?? existing.dueDate,
        currency: body.currency ?? existing.currency,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        terms: body.terms !== undefined ? body.terms : existing.terms,
        updatedAt: now,
      })
      .where(eq(accountingTables.invoices.id, id));
  }

  return { success: true };
});
