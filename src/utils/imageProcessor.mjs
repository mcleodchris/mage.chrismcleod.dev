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
 * @returns {Promise<Object>} - A promise that resolves to the metadata of the processed image.
 */
export const process = async (source, sizes, formats) => {
  const metadata = await Image(source, {
    widths: sizes,
    formats: formats,
    outputDir: "saved/resized/",
    filenameFormat: getFileName,
  });

  return metadata;
};
