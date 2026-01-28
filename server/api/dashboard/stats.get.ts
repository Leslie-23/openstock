import { eq, sql, lte, desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();

  const totalProductsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(tables.products)
    .where(eq(tables.products.isActive, true));
  const totalProducts = totalProductsResult[0]?.count ?? 0;

  const totalSuppliersResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(tables.suppliers)
    .where(eq(tables.suppliers.isActive, true));
  const totalSuppliers = totalSuppliersResult[0]?.count ?? 0;

  // Get actual count of all low stock products
  const lowStockCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(tables.products)
    .where(
      sql`${tables.products.stockQuantity} <= ${tables.products.stockMin} AND ${tables.products.isActive} = 1`
    );
  const lowStockCount = lowStockCountResult[0]?.count ?? 0;

  // Get top 5 low stock products for display
  const lowStockProducts = await db
    .select()
    .from(tables.products)
    .where(
      sql`${tables.products.stockQuantity} <= ${tables.products.stockMin} AND ${tables.products.isActive} = 1`
    )
    .orderBy(sql`${tables.products.stockQuantity} - ${tables.products.stockMin} ASC`)
    .limit(5);

  const stockValueResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${tables.products.costPrice} * ${tables.products.stockQuantity}), 0)`,
    })
    .from(tables.products)
    .where(eq(tables.products.isActive, true));
  const totalStockValue =
    Math.round((stockValueResult[0]?.total ?? 0) * 100) / 100;

  // Calculate items moved out and their total value
  const movedOutResult = await db
    .select({
      totalQuantity: sql<number>`COALESCE(SUM(ABS(${tables.stockMovements.quantity})), 0)`,
      totalValue: sql<number>`COALESCE(SUM(ABS(${tables.stockMovements.quantity}) * COALESCE(${tables.stockMovements.unitCost}, 0)), 0)`,
      movementCount: sql<number>`count(*)`,
    })
    .from(tables.stockMovements)
    .where(eq(tables.stockMovements.type, 'out'));

  const movedOutQuantity = movedOutResult[0]?.totalQuantity ?? 0;
  const movedOutValue = Math.round((movedOutResult[0]?.totalValue ?? 0) * 100) / 100;
  const movedOutCount = movedOutResult[0]?.movementCount ?? 0;

  const recentMovements = await db.query.stockMovements.findMany({
    limit: 5,
    orderBy: [desc(tables.stockMovements.createdAt)],
    with: {
      product: true,
    },
  });

  return {
    totalProducts,
    totalSuppliers,
    lowStockCount,
    totalStockValue,
    lowStockProducts,
    recentMovements,
    movedOutQuantity,
    movedOutValue,
    movedOutCount,
  };
});
