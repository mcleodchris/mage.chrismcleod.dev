/**
 * Represents a utility module for interacting with Azure Blob Storage.
 * @module azureStorage
 */
import { BlobServiceClient, StorageSharedKeyCredential, newPipeline } from "@azure/storage-blob";
import { promises as fs } from "fs";


/**
 * The Azure Storage account name.
 * @type {string}
 */
const account = process.env.STORAGE_ACCOUNT || "your-account-name";

/**
 * The Azure Storage account key.
 * @type {string}
 */
const accountKey = process.env.STORAGE_KEY || "your-account-key";

// Create a new pipeline with the shared key credential
const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const pipeline = newPipeline(sharedKeyCredential);

// Create a new BlobServiceClient
const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    pipeline
);

/**
 * The name of the container in Azure Blob Storage.
 * @type {string}
 */
const containerName = process.env.CONTAINER_NAME || "images";

// Create a new container client
const containerClient = blobServiceClient.getContainerClient(containerName);

/**
 * Uploads a file to Azure Blob Storage.
 * @param {string} filePath - The path of the file to upload.
 * @param {string} blobName - The name of the blob in Azure Blob Storage.
 * @returns {Promise<void>} A promise that resolves when the upload is complete.
 */
export const uploadToAzureBlobStorage = async (filePath, blobName) => {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const data = await fs.readFile(filePath);
    await blockBlobClient.upload(data, data.length);
};
