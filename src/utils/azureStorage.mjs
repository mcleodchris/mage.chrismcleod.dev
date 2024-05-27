import { BlobServiceClient, StorageSharedKeyCredential, newPipeline } from "@azure/storage-blob";
import { promises as fs } from "fs";

// Add your Azure Storage Account's name and a shared key
const account = process.env.STORAGE_ACCOUNT || "your-account-name";
const accountKey = process.env.STORAGE_KEY || "your-account-key";

// Create a new pipeline with the shared key credential
const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const pipeline = newPipeline(sharedKeyCredential);

// Create a new BlobServiceClient
const blobServiceClient = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    pipeline
);

// Create a new container client
const containerName = process.env.CONTAINER_NAME || "images";
const containerClient = blobServiceClient.getContainerClient(containerName);

// Function to upload a file to Azure Blob Storage
export const uploadToAzureBlobStorage = async (filePath, blobName) => {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const data = await fs.readFile(filePath);
    await blockBlobClient.upload(data, data.length);
};

// // Now, you can use this function to upload your images
// const imagePath = await saveImage(imageFile, imageFile.originalname);
// await uploadToAzureBlobStorage(imagePath, imageFile.originalname);

// // Similarly, upload the resized versions
// for (let size of [320, 570, 820]) {
//   for (let format of ["avif", "webp", "jpeg"]) {
//     const resizedImagePath = `${imagePath}_${size}.${format}`;
//     await uploadToAzureBlobStorage(resizedImagePath, `${imageFile.originalname}_${size}.${format}`);
//   }
// }