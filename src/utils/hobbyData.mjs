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

/**
 * Creates a new hobby log entry in Cosmos DB
 * @param {Object} container - Cosmos DB container
 * @param {Object} entryData - Entry data containing item, game, modelCount, completedDate
 * @returns {Promise<Object>} The created entry with id and metadata
 */
export const createHobbyEntry = async (container, entryData) => {
  const now = new Date().toISOString();
  const entry = {
    id: crypto.randomUUID(),
    item: entryData.item,
    game: entryData.game,
    modelCount: parseInt(entryData.modelCount, 10),
    completedDate: entryData.completedDate || now,
    createdAt: now,
    year: new Date(entryData.completedDate || now).getFullYear(),
  };

  const { resource } = await container.items.create(entry);
  return resource;
};
