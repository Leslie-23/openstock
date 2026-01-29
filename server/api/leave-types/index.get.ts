export default defineEventHandler(async () => {
  const db = useDB();

  const types = await db.query.leaveTypes.findMany({
    orderBy: (lt, { asc }) => [asc(lt.name)],
  });

  return types;
});
