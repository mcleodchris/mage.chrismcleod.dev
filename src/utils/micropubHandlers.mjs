import { promises as fs } from "fs";
import { saveImage } from "./fileHandler.mjs";
import { processImage } from "./imageProcessor.mjs";
import { getImageData, saveImageData } from "./imageList.mjs";
import { uploadToAzureBlobStorage } from "./azureStorage.mjs";
import { extractExifData, extractPngMetadata } from "./exifExtractor.mjs";
import log from "./logger.mjs";
import { uploadToBunnyStorage } from "./bunnyStorage.mjs";

/**
 * Handles the upload of an image file.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} The response object.
 */
export async function handleUpload(req, res) {
  // Check if the request is authenticated
  if (!req.authenticated) {
    log.error("Unauthorised request");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // multer adds a 'file' object to 'req' when 'upload.single('file')' middleware is used
  const imageFile = req.file;

  if (!imageFile) {
    log.error("Invalid request");
    return res.status(400).json({ message: "Invalid request" });
  }

  const baseUrl = process.env.BASE_URL || "http://localhost:3000/saved";

  const imagePath = await saveImage(imageFile, imageFile.originalname);
  log.info(`Image saved to ${imagePath}`);
  // delete the temporary file after saving it
  await fs.unlink(imageFile.path);
  log.info(`Temporary file deleted: ${imageFile.path}`);

  const sizes = [320, 570, 820, 650, 960, 1200];
  const formats = ["avif", "webp", "jpeg"];
  const metadataResults = await Promise.all(
    formats.map((format) => processImage(imagePath, sizes, [format], baseUrl))
  );
  // Merge metadataResults into a single metadata object
  const metadata = {};
  formats.forEach((format, idx) => {
    metadata[format] = metadataResults[idx][format];
  });

  log.info(`Image processed`);

  // Extract metadata if possible
  let exifData = {};
  let creationDate = new Date().toISOString();
  try {
    if (imageFile.mimetype === "image/jpeg") {
      exifData = extractExifData(imagePath);
      if (exifData.DateTimeOriginal) {
        creationDate = new Date(exifData.DateTimeOriginal * 1000).toISOString();
      }
      log.info(`EXIF data extracted: ${JSON.stringify(exifData)}`);
    } else if (imageFile.mimetype === "image/png") {
      const pngMetadata = extractPngMetadata(imagePath);
      if (pngMetadata.tEXt && pngMetadata.tEXt.creation_time) {
        creationDate = new Date(pngMetadata.tEXt.creation_time).toISOString();
      }
      log.info(`PNG metadata extracted: ${JSON.stringify(pngMetadata)}`);
    }
  } catch (error) {
    log.warn(`Failed to extract metadata: ${error.message}`);
  }

  //get the filename from imagePath
  const path = imagePath.split("/");
  const filename = path.pop();
  const imageUrl = `${baseUrl}/${filename}`;

  const uploadPath = process.env.UPLOAD_PATH || "images/";

  // upload to Bunny
  await uploadToBunnyStorage(
    req.bunnyStorageConfig,
    imagePath,
    `${uploadPath}/${filename}`
  );
  log.info(`Image uploaded to Bunny Storage: ${imageUrl}`);
  // // upload to Azure Blob Storage
  // await uploadToAzureBlobStorage(
  //   req.storageContainerClient,
  //   imagePath,
  //   `${uploadPath}/${filename}`
  // );
  log.info(`Image uploaded to Azure Blob Storage`);
  await fs.unlink(imagePath);
  log.info(`Local image deleted: ${imagePath}`);

  for (const format in metadata) {
    for (const size of metadata[format]) {
      // upload resized images to Bunny Storage
      await uploadToBunnyStorage(
        req.bunnyStorageConfig,
        size.outputPath,
        `${uploadPath}/resized/${size.filename}`
      );
      log.info(
        `Resized image uploaded to Bunny Storage: ${format} :: ${size.width}`
      );
      // await uploadToAzureBlobStorage(
      //   req.storageContainerClient,
      //   size.outputPath,
      //   `${uploadPath}/resized/${size.filename}`
      // );
      // log.info(
      //   `Resized image uploaded to Azure Blob Storage: ${format} :: ${size.width}`
      // );
      // delete the resized image after uploading it
      await fs.unlink(size.outputPath);
    }
  }

  // save our image data to the Cosmos DB
  await saveImageData(req.container, {
    original: imageUrl,
    metadata,
    exifData,
    creationDate,
  });
  log.info(`Image data saved to Cosmos DB`);

  res.setHeader("Location", imageUrl);
  log.info(`Finished processing image: ${imageUrl}`);
  return res.status(201).end();
}

/**
 * Retrieves the last uploaded image data.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} The response object.
 */
export async function getLastUploadedImage(req, res) {
  // Check if the request is authenticated
  if (!req.authenticated) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { q } = req.query;

  if (q === "last") {
    const images = await getImageData(req.container);
    // get the newest entry from the images array (should be the first one)
    const lastEntry = images[0];
    if (lastEntry) {
      return res.json(lastEntry);
    } else {
      return res.status(404).json({ message: "No entries found" });
    }
  } else {
    return res.status(400).json({ message: "Invalid request" });
  }
}
