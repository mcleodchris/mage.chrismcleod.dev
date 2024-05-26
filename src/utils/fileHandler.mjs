import fs from 'fs';
import path from 'path';

export function saveImage(imageFile, originalFileName) {
  const tempDir = path.join(process.cwd(), "saved");
  
  // Generate a unique filename for the image
  const filename = generateUniqueFilename(originalFileName);
  
  // Save the image to the temporary directory
  const imagePath = path.join(tempDir, filename);
  fs.copyFileSync(imageFile.path, imagePath);
  
  return imagePath;
}

function generateUniqueFilename(originalFileName) {
  // Get the file extension from the original file name
  const fileExtension = path.extname(originalFileName);
  
  // Generate a unique filename using a timestamp and a random number
  const timestamp = Date.now();
  const randomNumber = Math.floor(Math.random() * 10000);
  return `${timestamp}-${randomNumber}${fileExtension}`;
}