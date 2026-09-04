import { eq, count } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();

  // Enforce product limit based on subscription tier
  const settingsRow = await db
    .select({ subscriptionTier: tables.settings.subscriptionTier })
    .from(tables.settings)
    .where(eq(tables.settings.id, 1))
    .get();
  const tier = settingsRow?.subscriptionTier || 'free';
  if (tier === 'free') {
    const [{ total }] = await db
      .select({ total: count() })
      .from(tables.products);
    if (total >= 25) {
      throw createError({
        statusCode: 403,
        message: 'Free plan is limited to 25 products. Upgrade to Pro for unlimited products.',
      });
    }
  }

  const body = await readBody(event);

  const id = generateId('prod');

  await db.insert(tables.products).values({
    id,
    name: body.name,
    sku: body.sku || null,
    barcode: body.barcode || null,
    description: body.description || null,
    categoryId: body.categoryId || null,
    costPrice: body.costPrice ?? 0,
    sellingPrice: body.sellingPrice ?? 0,
    marginPercent: body.marginPercent ?? 30,
    taxId: body.taxId || null,
    stockQuantity: body.stockQuantity ?? 0,
    stockMin: body.stockMin ?? 0,
    stockMax: body.stockMax || null,
    unit: body.unit || 'unit',
    supplierId: body.supplierId || null,
    isActive: true,
    options: body.options || null,
  });

  if (
    body.variants &&
    Array.isArray(body.variants) &&
    body.variants.length > 0
  ) {
    const variantsToInsert = body.variants.map((v: any) => ({
      id: generateId('var'),
      productId: id,
      name: v.name,
      sku: v.sku || null,
      barcode: v.barcode || null,
      costPrice: v.costPrice ?? 0,
      marginPercent: v.marginPercent ?? 30,
      price: v.price ?? 0,
      taxId: v.taxId || null,
      stockQuantity: v.stockQuantity ?? 0,
      stockMin: v.stockMin ?? 0,
      stockMax: v.stockMax || null,
      supplierId: v.supplierId || null,
    }));
    await db.insert(tables.productVariants).values(variantsToInsert);
  }

  return { id };
});
