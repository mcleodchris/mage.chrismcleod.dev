import express from "express";
import dotenv from "dotenv";
import { Octokit } from "octokit";
import { createContentTemplate } from "../utils/templates.mjs";
import log from "../utils/logger.mjs";
import slugify from "slugify";

const config = dotenv.config();

const router = express.Router();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const paths = {
    blog: process.env.BLOG_CONTENT_PATH || "src/blog/",
    photo: process.env.PHOTO_CONTENT_PATH || "src/posts/",
    // add other types as needed
};

/**
 * Generates a filename based on the post type and data.
 * @param {string} type - The type of content.
 * @param {object} data - The data of the content.
 * @returns {string} - The generated filename.
 */
function generateFilename(type, data) {
  switch (type) {
    case "blog":
      const date = new Date(data.frontmatter.date).toISOString().split("T")[0];
      const slug = slugify(data.frontmatter.title, { lower: true });
      return `${date}-${slug}.md`;
    case "photo":
      return `${data.frontmatter.id}.md`;
    default:
      return `${Date.now()}.md`;
  }
}

/**
 * @openapi
 * /publish:
 *   post:
 *     summary: Create a new content file in the GitHub repository
 *     tags: [Publish]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: The type of content
 *                 example: "blog"
 *               data:
 *                 type: object
 *                 description: The data of the content
 *                 example: { "frontmatter": { "title": "My Blog Post", "date": "2023-10-01" }, "content": "This is the content of the blog post." }
 *     responses:
 *       201:
 *         description: Content created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Content created successfully"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to create content"
 */
router.post("/", async (req, res) => {
  const { type, data } = req.body;

  try {
    const content = createContentTemplate(type, data);
    const filename = generateFilename(type, data);
    const path = `${paths[type]}${filename}`;

    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}',{
      owner: process.env.GITHUB_OWNER,
      repo: process.env.GITHUB_REPO,
      path,
      committer: {
        name: process.env.GITHUB_NAME,
        email: process.env.GITHUB_EMAIL,
      },
      message: `Create new ${type} content`,
      content: Buffer.from(content).toString("base64"),
    });

    res.status(201).send({ message: "Content created successfully" });
  } catch (error) {
    log.error("Error creating content:", error);
    res.status(500).send({ error: "Failed to create content" });
  }
});

export default router;
