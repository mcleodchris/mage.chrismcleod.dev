export const getHobbyData = async (container) => {
  let entries = [];
  try {
    const querySpec = {
      query: "SELECT * FROM c ORDER BY c.createdAt DESC",
    };
    const { resources: items } = await container.items
      .query(querySpec)
      .fetchAll();
    entries = items;
  } catch (error) {
    console.error(error);
  }
  return entries;
};
