import { desc, eq, sql } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();

  // Fetch all categories with parent relation
  const categories = await db.query.categories.findMany({
    orderBy: [desc(tables.categories.createdAt)],
    with: {
      parent: true,
    },
  });

  // Get product counts per category
  const productCounts = await db
    .select({
      categoryId: tables.products.categoryId,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(tables.products)
    .groupBy(tables.products.categoryId);

  // Create a map for quick lookup
  const countMap = new Map(
    productCounts.map((pc) => [pc.categoryId, pc.count])
  );

  // Add _count to each category
  return categories.map((category) => ({
    ...category,
    _count: {
      products: countMap.get(category.id) ?? 0,
    },
  }));
});
