export default defineEventHandler(async () => {
  const db = useHRDB();

  const types = await db.query.leaveTypes.findMany({
    orderBy: (lt, { asc }) => [asc(lt.name)],
  });

  return types;
});
