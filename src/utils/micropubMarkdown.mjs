import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import log from "./logger.mjs";

// Helper to generate random 5-character string
function randomString(length = 5) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function toYaml(obj, indent = 0) {
    const pad = "  ".repeat(indent);
    return Object.entries(obj)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
            if (Array.isArray(value)) {
                if (value.length === 0) return `${pad}${key}: []`;
                return `${pad}${key}:\n${value
                    .map((v) => {
                        if (typeof v === "object" && v !== null) {
                            return `${pad}  -\n${toYaml(v, indent + 2)}`;
                        } else {
                            return `${pad}  - ${JSON.stringify(v)}`;
                        }
                    })
                    .join("\n")}`;
            } else if (typeof value === "object" && value !== null) {
                return `${pad}${key}:\n${toYaml(value, indent + 1)}`;
            } else {
                return `${pad}${key}: ${JSON.stringify(value)}`;
            }
        })
        .join("\n");
}

/**
 * Utility to generate 11ty-compatible markdown with YAML frontmatter for Micropub posts.
 * @param {Object} micropub - Original Micropub JSON payload
 * @param {string} postType - note|bookmark|like
 * @param {Object} options - { date, title, _url, extraFrontmatter }
 * @returns {Object} { markdown, filePath, slug }
 */
export function generateMicropubMarkdown(micropub, postType, options = {}) {
    const { date, title, _url, extraFrontmatter = {} } = options;
    const published = date || new Date().toISOString();
    const slug = randomString(5);
    let fileDir = "notes";
    const frontmatter = {
        id: uuidv4(),
        title,
        date: published,
        type: postType,
        micropub,
        ...extraFrontmatter,
    };
    let content = "";
    log.debug(`[MicropubMarkdown] Generating markdown for postType: ${postType}, slug: ${slug}`);
    log.debug(`[MicropubMarkdown] Payload: ${JSON.stringify(micropub)}`);
    if (postType === "note") {
        fileDir = "notes";
        content = micropub.properties.content?.[0] || "";
        frontmatter.tags = micropub.properties.category || [];
        log.debug(`[MicropubMarkdown] Note content: ${content}`);
    } else if (postType === "bookmark") {
        fileDir = "bookmarks";
        frontmatter.bookmark_of = micropub.properties["bookmark-of"]?.[0] || "";
        frontmatter.tags = micropub.properties.category || [];
        frontmatter.name = micropub.properties.name?.[0] || "";
        content = micropub.properties.content?.[0] || "";
        log.debug(
            `[MicropubMarkdown] Bookmark content: ${content}, bookmark_of: ${frontmatter.bookmark_of}`,
        );
    } else if (postType === "like") {
        fileDir = "likes";
        frontmatter.like_of = micropub.properties["like-of"]?.[0] || "";
        frontmatter.tags = micropub.properties.category || [];
        content = micropub.properties.content?.[0] || "";
        log.debug(`[MicropubMarkdown] Like content: ${content}, like_of: ${frontmatter.like_of}`);
    }
    // YAML frontmatter
    // Helper to convert JS object to nested YAML

    const yaml = `---\n${toYaml(frontmatter)}\n---\n\n`;
    log.debug(`[MicropubMarkdown] YAML frontmatter: ${yaml}`);
    const markdown = `${yaml + content}\n`;
    // File path: src/{type}/YYYY-MM-DD-{slug}.md
    const dateObj = new Date(published);
    const yyyy = dateObj.getUTCFullYear();
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getUTCDate());
    const fileName = `${yyyy}-${mm}-${dd}-${slug}.md`;
    const filePath = path.join("src", fileDir, fileName);
    log.debug(`[MicropubMarkdown] Markdown file path: ${filePath}`);
    return { markdown, filePath, slug };
}
