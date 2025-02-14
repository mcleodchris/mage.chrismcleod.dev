import { stringify } from 'yaml';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a content template based on the type and data provided.
 * @param {string} type - The type of content to create.
 * @param {object} data - The data to include in the content.
 * @returns {string} - The generated content.
 */
export function createContentTemplate(type, data) {
    let { frontmatter, content } = data;

    if (!frontmatter.id) {
        frontmatter.id = uuidv4();
    }

    const frontmatterString = stringify(frontmatter);

    return `---\n${frontmatterString}---\n\n${content}`;
}
