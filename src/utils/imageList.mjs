import { promises as fs } from 'fs';


/**
 * Retrieves image data from a JSON file.
 * @returns {Promise<Array>} A promise that resolves to an array of image data.
 */
export const getImageData = async () => {
    let images = [];
    try {
        const contents = await fs.readFile(process.env.IMAGE_JSON_FILE, "utf8");
        images = JSON.parse(contents);
    } catch (error) {
        console.error(error);
    }

    return images;
}