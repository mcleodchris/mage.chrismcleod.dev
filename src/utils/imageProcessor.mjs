/**
 * @fileoverview This file contains the image processing utility functions.
 * @module utils/imageProcessor
 */

import Image from "@11ty/eleventy-img";

/**
 * Extracts the file name with the specified width and format.
 * @param {string} id - The unique identifier (unused).
 * @param {string} src - The original image path.
 * @param {number} width - The current width in pixels.
 * @param {string} format - The current file format.
 * @param {Object} options - The Image plugin options (unused).
 * @returns {string} - The file name with the specified width and format.
 */
function getFileName(id, src, width, format, options) {
  const path = src.split("/");
  const filename = path.pop().split(".");
  const name = filename[0];

  return `${name}-${width}.${format}`;
}

/**
 * Process the image with the specified sizes and formats.
 * @param {string} source - The source image path.
 * @param {number[]} sizes - An array of widths for resizing the image.
 * @param {string[]} formats - An array of formats for converting the image.
 * @param {string} baseUrl - The base URL for the processed image.
 * @returns {Promise<Object>} - A promise that resolves to the metadata of the processed image.
 */
export const processImage = async (source, sizes, formats, baseUrl) => {
  const metadata = await Image(source, {
    widths: sizes,
    formats: formats,
    outputDir: `${process.env.SAVE_PATH || "saved"}/resized`,
    filenameFormat: getFileName,
  });

  for (const format in metadata) {
    metadata[format].forEach((item) => {
      item.url = `${baseUrl}/resized/${item.filename}`;
      item.srcset = `${baseUrl}/resized/${item.filename} ${item.width}w`;
    });
  }

  return metadata;
};
