import fs from "fs";
import exifParser from "exif-parser";
import pngMetadata from "png-metadata";

/**
 * Extracts EXIF data from an image file.
 * @param {string} imagePath - The path to the image file.
 * @returns {object} - The extracted EXIF data.
 */
export function extractExifData(imagePath) {
  const buffer = fs.readFileSync(imagePath);
  const parser = exifParser.create(buffer);
  const result = parser.parse();
  return result.tags;
}

/**
 * Extracts metadata from a PNG file.
 * @param {string} imagePath - The path to the image file.
 * @returns {object} - The extracted metadata.
 */
export function extractPngMetadata(imagePath) {
  const buffer = fs.readFileSync(imagePath);
  const metadata = pngMetadata.read(buffer);
  return metadata;
}
