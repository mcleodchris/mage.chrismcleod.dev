import express from "express";
import OpenAI from "openai";
import log from "../utils/logger.mjs";

const router = express.Router();

const openaiConfig = { apiKey: process.env.OPENAI_API_KEY };
if (process.env.OPENAI_BASE_URL) {
    openaiConfig.baseURL = process.env.OPENAI_BASE_URL;
}
const openai = new OpenAI(openaiConfig);

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

/**
 * @openapi
 * /openai/generate-alt-text:
 *   post:
 *     summary: Generate alt text for an image
 *     tags: [OpenAI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageUrl
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 description: URL of the image to generate alt text for
 *                 example: "https://example.com/image.jpg"
 *     responses:
 *       200:
 *         description: Alt text generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 altText:
 *                   type: string
 *                   description: Generated alt text
 *                   example: "A cat sitting on a windowsill looking outside."
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "imageBase64 is required"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to generate alt text"
 */
router.post("/generate-alt-text", async (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).json({ error: "Image URL is required" });
    }

    let dataUri;
    try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            return res.status(400).json({ error: "Failed to fetch image" });
        }
        const mimeType = imageResponse.headers.get("content-type") ?? "image/jpeg";
        const buffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        dataUri = `data:${mimeType};base64,${base64}`;
    } catch (error) {
        log.error("Error fetching image:", error);
        return res.status(400).json({ error: "Failed to fetch image" });
    }

    try {
        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: "developer",
                    content: [
                        {
                            type: "text",
                            text: `Please provide a functional, objective description of the provided image for use as accessibility alt-text when the image is used online, in no more than around 50-80 words so that someone who could not see it would be able to imagine it. If possible, follow an "object-action-context" framework. The object is the main focus. The action describes what's happening, usually what the object is doing. The context describes the surrounding environment.
If there is text found in the image, do your best to transcribe the important bits, even if it extends the word count beyond 80 words.
If there is no text found in the image, then there is no need to mention it.
Always use British English spelling when not directly transcribing text from the image.
Your output must be safe to include directly as an HTML attribute, so, for example, NEVER use ".
You should not begin the description with any variation of "The image", nor word the description as "the object... the action... the context...", as that is awkward to read.
Return only the description text, with no preamble, labels, or surrounding markup.
If any detail is unclear or uncertain, omit it rather than guessing.
Before finalising, check that the response is objective, evocative, uses British English where applicable, avoids unsafe straight double quotes, and stays within the length guidance unless needed to include important transcribed text.`,
                        },
                    ],
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "describe this image" },
                        {
                            type: "image_url",
                            image_url: { url: dataUri },
                        },
                    ],
                },
            ],
            store: false,
        });

        const altText = response.choices[0].message.content;
        res.json({ altText });
    } catch (error) {
        log.error("Error generating alt text:", error);
        res.status(500).json({ error: "Failed to generate alt text" });
    }
});

export default router;
