import fetch from "node-fetch";
import log from "./logger.mjs";

/**
 * Fetches and processes the JSON Feed from chrismcleod.photos
 * @param {Container} container - The CosmosDB container client
 * @returns {Promise<Array>} - Array of processed items
 */
export async function processPhotoFeed(container) {
  try {
    const response = await fetch("https://chrismcleod.photos/feed.json");
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }

    const feed = await response.json();
    const items = feed.items || [];
    
    // Process each item and save to CosmosDB
    const processedItems = await Promise.all(
      items.map(async (item) => {
        const crosspostData = {
          id: item.id,
          datePublished: item.date_published,
          type: "photo",
          source: "chrismcleod.photos"
        };

        // Check if item already exists
        const { resources } = await container.items
          .query({
            query: "SELECT * FROM c WHERE c.id = @id",
            parameters: [{ name: "@id", value: item.id }]
          })
          .fetchAll();

        if (resources.length === 0) {
          await container.items.create(crosspostData);
          log.info(`Created new crosspost entry for photo ${item.id}`);
          return crosspostData;
        }

        return null; // Item already exists
      })
    );

    return processedItems.filter(item => item !== null);
  } catch (error) {
    log.error("Error processing photo feed:", error);
    throw error;
  }
} 