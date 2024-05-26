import { promises as fs } from "fs";
import path from "path";
import { v4 as uuid } from "uuid";

const saveDir = path.join(process.cwd(), process.env.SAVE_PATH || "saved/");

function generateUniqueFilename(originalFileName) {
  // Get the file extension from the original file name
  const fileExtension = path.extname(originalFileName);

  // Generate a unique filename using uuid
  const uniqueName = uuid();
  return `${uniqueName}${fileExtension}`;
}

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


