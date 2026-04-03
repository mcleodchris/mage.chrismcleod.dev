export const getHobbyData = async (container) => {
    let entries = [];
    try {
        const querySpec = {
            query: "SELECT * FROM c ORDER BY c.createdAt DESC",
        };
        const { resources: items } = await container.items.query(querySpec).fetchAll();
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

/**
 * Updates an existing hobby log entry in Cosmos DB
 * @param {Object} container - Cosmos DB container
 * @param {string} id - Entry ID to update
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} The updated entry
 */
export const updateHobbyEntry = async (container, id, updateData) => {
    const { resource: existing } = await container.item(id, id).read();

    if (!existing) {
        throw new Error("Entry not found");
    }

    const updated = {
        ...existing,
        ...updateData,
        id,
        createdAt: existing.createdAt,
    };

    if (updateData.modelCount) {
        updated.modelCount = parseInt(updateData.modelCount, 10);
    }

    if (updateData.completedDate) {
        updated.completedDate = updateData.completedDate;
        updated.year = new Date(updateData.completedDate).getFullYear();
    }

    const { resource } = await container.item(id, id).replace(updated);
    return resource;
};

/**
 * Deletes a hobby log entry from Cosmos DB
 * @param {Object} container - Cosmos DB container
 * @param {string} id - Entry ID to delete
 * @returns {Promise<void>}
 */
export const deleteHobbyEntry = async (container, id) => {
    await container.item(id, id).delete();
};

/**
 * Triggers GitHub workflow dispatch to rebuild site after hobby data changes
 * @param {Object} octokit - Octokit instance
 * @param {Object} options - Dispatch options
 * @returns {Promise<void>}
 */
export const triggerWorkflowDispatch = async (octokit, options = {}) => {
    const { owner, repo, eventType = "function_trigger", clientPayload = {} } = options;

    await octokit.request("POST /repos/{owner}/{repo}/dispatches", {
        owner,
        repo,
        event_type: eventType,
        client_payload: clientPayload,
        headers: {
            "X-GitHub-Api-Version": "2022-11-28",
        },
    });
};
