import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useAccountingDB();
  const id = getRouterParam(event, 'id')!;

  const entry = await db.query.journalEntries.findFirst({
    where: eq(accountingTables.journalEntries.id, id),
    with: {
      lines: {
        with: {
          account: true,
        },
      },
    },
  });

  if (!entry) {
    throw createError({ statusCode: 404, message: 'Journal entry not found' });
  }

  return entry;
});
