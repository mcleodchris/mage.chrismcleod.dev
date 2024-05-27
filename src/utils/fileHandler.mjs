import { promises as fs } from "fs";
import path from "path";
import { v4 as uuid } from "uuid";

const saveDir = path.join(process.cwd(), process.env.SAVE_PATH || "saved/");

/**
 * Generates a unique filename based on the original file name.
 * @param {string} originalFileName - The original file name.
 * @returns {string} The unique filename.
 */
function generateUniqueFilename(originalFileName) {
  // Get the file extension from the original file name
  const fileExtension = path.extname(originalFileName);

  // Generate a unique filename using uuid
  const uniqueName = uuid();
  return `${uniqueName}${fileExtension}`;
}

/**
 * Saves an image file to the specified directory.
 * @param {Object} imageFile - The image file object.
 * @param {string} originalFileName - The original file name of the image.
 * @returns {Promise<string>} A promise that resolves to the saved image path.
 * @throws {Error} If there is an error saving the image.
 */
export async function saveImage(imageFile, originalFileName) {
  try {
    const filename = generateUniqueFilename(originalFileName);

    // Save the image from the temporary directory
    const imagePath = path.join(saveDir, filename);
    await fs.copyFile(imageFile.path, imagePath);

    return imagePath;
  } catch (error) {
    console.error(`Failed to save image: ${error}`);
    throw error; // re-throw the error so it can be handled by the caller
  }
}


