import { promises as fs } from 'fs';

const imageJsonFile = process.env.IMAGE_JSON_FILE || "saved/images.json";
/**
 * Retrieves image data from a JSON file.
 * @returns {Promise<Array>} A promise that resolves to an array of image data.
 */
export const getImageData = async () => {
    let images = [];
    try {
        const contents = await fs.readFile(imageJsonFile, "utf8");
        images = JSON.parse(contents);
    } catch (error) {
        console.error(error);
    }

    return images;
}

/**
 * Saves image data to a JSON file.
 * @param {Object} images An array of image data to save.
 * @returns {Promise<void>} A promise that resolves when the data is saved.
 */
export const saveImageData = async (image) => {
    let images = [];
    try {
      const data = await fs.readFile(imageJsonFile, "utf8");
      images = JSON.parse(data);
    } catch (error) {
      console.error(`Failed to read file ${imageJsonFile}:`, error);
    }

    // add the imageUrl and metadata to the images array
    images.push(image);

    // save the images array to images.json
    try {
      await fs.writeFile(imageJsonFile, JSON.stringify(images, null, 2));
    } catch (error) {
      console.error(`Failed to write file ${imageJsonFile}:`, error);
    }
}