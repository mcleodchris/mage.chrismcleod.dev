import Image from "@11ty/eleventy-img";

function getFileName(id, src, width, format, options) {
  // id: unique identifier (unused)
  // src: original image path
  // width: current width in px
  // format: current file format
  // options: Image plugin options (unused)
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
      item.outputPath = `${baseUrl}/resized/${item.filename}`;
    });
  }

  return metadata;
};
