// import fetch from "node-fetch";
import log from "./logger.mjs";

const targets = [
  "https://brid.gy/publish/mastodon",
  "https://brid.gy/publish/bluesky",
];

/**
 * Sends a webmention to Bridgy for syndication
 * @param {string} sourceUrl - The URL of the source content
 * @returns {Promise<boolean>} - Whether the webmention was successfully sent
 */
async function sendWebmention(sourceUrl) {
  try {
    targets.forEach(async (target) => {
      const params = new URLSearchParams();
      params.append("source", sourceUrl);
      params.append("target", target);

      const response = await fetch("https://brid.gy/publish/webmention", {
        method: "POST",
        body: params,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (response.status === 201) {
        log.info(`Successfully sent webmention for ${sourceUrl} to ${target}`);
      } else {
        log.warn(
          `Failed to send webmention for ${sourceUrl} to ${target}: ${response.status}`
        );
      }
    });

    return true;
  } catch (error) {
    log.error(`Error sending webmention for ${sourceUrl}:`, error);
    return false;
  }
}

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
          source: "chrismcleod.photos",
          url: item.url,
          webmentionSent: false,
        };

        // Check if item already exists
        const { resources } = await container.items
          .query({
            query: "SELECT * FROM c WHERE c.id = @id",
            parameters: [{ name: "@id", value: item.id }],
          })
          .fetchAll();

        if (resources.length === 0) {
          // Send webmention before saving to database
          const webmentionSent = await sendWebmention(item.url);
          crosspostData.webmentionSent = webmentionSent;

          await container.items.create(crosspostData);
          log.info(`Created new crosspost entry for photo ${item.id}`);
          return crosspostData;
        }

        return null; // Item already exists
      })
    );

    return processedItems.filter((item) => item !== null);
  } catch (error) {
    log.error("Error processing photo feed:", error);
    throw error;
  }
}
