import dotenv from 'dotenv';
import { CosmosClient } from "@azure/cosmos";

dotenv.config();

const connectionString = process.env.COSMOS_CONNECTION_STRING || "your-connection-string";

// Create a new CosmosClient
const client = new CosmosClient(connectionString);

// Get a reference to the database and the container
const database = client.database(process.env.COSMOS_DATABASE || "your-database");
const container = database.container(process.env.COSMOS_CONTAINER || "your-container");

/**
 * @typedef {Object} ImageObject
 * @property {string} original - The URL of the original image.
 * @property {Object} metadata - The metadata of the image.
 * @property {Array<Object>} metadata.avif - The avif format metadata of the image.
 * @property {Array<Object>} metadata.webp - The webp format metadata of the image.
 * @property {Array<Object>} metadata.jpeg - The jpeg format metadata of the image.
 * @property {string} [createdAt] - The ISO string of the creation date of the image.
 * @property {string} [id] - The unique identifier of the image.
 */

/**
 * Retrieves image data from Azure Cosmos DB.
 * @returns {Promise<Array<ImageObject>>} A promise that resolves to an array of image data.
 */
export const getImageData = async () => {
  let images = [];
  try {
    // Query the container
    const querySpec = {
      query: "SELECT c.id, c.original, c.metadata, c.createdAt FROM c ORDER BY c.createdAt DESC"
    };
    const { resources: items } = await container.items.query(querySpec).fetchAll();
    images = items;
  } catch (error) {
    console.error(error);
  }

  return images;
};

/**
 * Saves image data to Cosmos DB container.
 * @param {ImageObject} image - The image data to be saved.
 * @returns {Promise<void>} A promise that resolves when the image data is saved.
 */
export const saveImageData = async (image) => {
  try {
    // Add the image data to the container
    const { resource: createdItem } = await container.items.create(image);
    console.log(`Created item with id: ${createdItem.id}`);
  } catch (error) {
    console.error(`Failed to add item to Cosmos DB:`, error);
  }
};