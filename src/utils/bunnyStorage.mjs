/**
 * Utility module for interacting with Bunny.net Storage API.
 * @module bunnyStorage
 */
import { createReadStream } from "node:fs";
import https from "node:https";
import log from "./logger.mjs";

/**
 * Uploads a file to Bunny.net Storage.
 * @param {Object} config - Bunny storage config object.
 * @param {string} config.region - Bunny storage region (empty string for German region).
 * @param {string} config.storageZone - Bunny storage zone name.
 * @param {string} config.accessKey - Bunny storage API key.
 * @param {string} filePath - Path to the file to upload.
 * @param {string} blobName - Name to use for the uploaded file in Bunny storage.
 * @returns {Promise<void>} Resolves when upload is complete.
 */
export async function uploadToBunnyStorage(config, filePath, blobName) {
    const REGION = config.region || "";
    const BASE_HOSTNAME = "storage.bunnycdn.com";
    const HOSTNAME = REGION ? `${REGION}.${BASE_HOSTNAME}` : BASE_HOSTNAME;
    const STORAGE_ZONE_NAME = config.storageZone;
    const ACCESS_KEY = config.accessKey;

    const readStream = createReadStream(filePath);
    const options = {
        method: "PUT",
        host: HOSTNAME,
        path: `/${STORAGE_ZONE_NAME}/${blobName}`,
        headers: {
            AccessKey: ACCESS_KEY,
            "Content-Type": "application/octet-stream",
        },
    };

    try {
        const responseData = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk.toString("utf8");
                });
                res.on("end", () => {
                    resolve(data);
                });
            });
            req.on("error", (error) => {
                reject(error);
            });
            readStream.pipe(req);
        });
        log.info(`bunnyStorage/uploadToBunnyStorage:: Response: ${responseData}`);
    } catch (error) {
        log.error(`bunnyStorage/uploadToBunnyStorage:: Error: ${error}`);
        throw error;
    }
}

/**
 * Creates a Bunny storage config object.
 * @param {string} storageZone - Bunny storage zone name.
 * @param {string} accessKey - Bunny storage API key.
 * @param {string} [region] - Bunny storage region (optional).
 * @returns {Object} Bunny storage config object.
 */
export function createBunnyStorageConfig(storageZone, accessKey, region = "") {
    return {
        region,
        storageZone,
        accessKey,
    };
}
