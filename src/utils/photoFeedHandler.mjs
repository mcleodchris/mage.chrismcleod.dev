// import fetch from "node-fetch";
import log from "./logger.mjs";

// Bridgy exposes one publish endpoint per silo. The keys are recorded per-item so a
// partial syndication (one silo accepted, another rejected) stays visible.
const targets = {
    mastodon: "https://brid.gy/publish/mastodon",
    bluesky: "https://brid.gy/publish/bluesky",
};

/** @returns {Record<string, boolean>} every target marked unsent */
function noTargetsSent() {
    return Object.fromEntries(Object.keys(targets).map((name) => [name, false]));
}

/**
 * Sends a webmention to Bridgy for syndication
 * @param {string} sourceUrl - The URL of the source content
 * @returns {Promise<Record<string, boolean>>} - Per-target acceptance, keyed by silo
 */
async function sendWebmention(sourceUrl) {
    const results = await Promise.all(
        Object.entries(targets).map(async ([name, target]) => {
            const params = new URLSearchParams();
            params.append("source", sourceUrl);
            params.append("target", target);

            try {
                const response = await fetch("https://brid.gy/publish/webmention", {
                    method: "POST",
                    body: params,
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                });

                // Bridgy answers 201 for a fresh syndication and 200 when the post was
                // already published, so both mean there is nothing left to do.
                if (response.ok) {
                    log.info(`Successfully sent webmention for ${sourceUrl} to ${target}`);
                    return [name, true];
                }

                // Bridgy explains the rejection in the body, not the status line.
                const body = await response.text().catch(() => "<unreadable body>");
                log.warn(
                    `Failed to send webmention for ${sourceUrl} to ${target}: ${response.status} ${body}`,
                );
                return [name, false];
            } catch (error) {
                log.error(`Error sending webmention for ${sourceUrl} to ${target}:`, error);
                return [name, false];
            }
        }),
    );

    return Object.fromEntries(results);
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
                    webmentionSent: noTargetsSent(),
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
            }),
        );

        return processedItems.filter((item) => item !== null);
    } catch (error) {
        log.error("Error processing photo feed:", error);
        throw error;
    }
}
