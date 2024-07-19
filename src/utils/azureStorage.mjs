/**
 * Represents a utility module for interacting with Azure Blob Storage.
 * @module azureStorage
 */
import { Container } from "@azure/cosmos";
import { BlobServiceClient, StorageSharedKeyCredential, newPipeline } from "@azure/storage-blob";
import { promises as fs } from "fs";
import log from "./logger.mjs";

/**
 * Uploads a file to Azure Blob Storage.
 * @param {Container} containerClient - The Blob Storage container client.
 * @param {string} filePath - The path of the file to upload.
 * @param {string} blobName - The name of the blob in Azure Blob Storage.
 * @returns {Promise<void>} A promise that resolves when the upload is complete.
 */
export async function uploadToAzureBlobStorage(containerClient, filePath, blobName) {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const data = await fs.readFile(filePath);
    await blockBlobClient.upload(data, data.length);
}

/**
 * Creates a container client for Azure Blob Storage.
 * @returns {ContainerClient} The container client.
 */
export function createStorageContainerClient(storageAccount, storageKey, containerName) {
    /**
     * The Azure Storage account name.
     * @type {string}
     */
    const account = storageAccount || "your-account-name";

    /**
     * The Azure Storage account key.
     * @type {string}
     */
    const accountKey = storageKey || "your-account-key";

    // Create a new pipeline with the shared key credential
    const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
    log.debug(`azureStorage/createStorageContainerClient:: sharedKeyCredential = ${JSON.stringify(sharedKeyCredential)}`);
    const pipeline = newPipeline(sharedKeyCredential);

    // Create a new BlobServiceClient
    const blobServiceClient = new BlobServiceClient(
        `https://${account}.blob.core.windows.net`,
        pipeline
    );
    log.info("azureStorage/createStorageContainerClient:: Created Storage Blob Service Client")

    // Create a new container client
    const containerClient = blobServiceClient.getContainerClient(containerName || "images");
    log.info("azureStorage/createStorageContainerClient:: Created Storage Container Client")
    return containerClient;
}
