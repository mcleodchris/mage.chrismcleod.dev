/**
 * System prompts for OpenAI API calls, grouped by feature area.
 */

export const imagePrompts = {
    /**
     * Instructs the model to generate accessible, objective alt text for an image.
     * Uses an object-action-context framework, British English, and HTML-safe output.
     */
    altText: `Please provide a functional, objective description of the provided image for use as accessibility alt-text when the image is used online, in no more than around 50-80 words so that someone who could not see it would be able to imagine it. If possible, follow an "object-action-context" framework. The object is the main focus. The action describes what's happening, usually what the object is doing. The context describes the surrounding environment.
    If there is text found in the image, do your best to transcribe the important bits, even if it extends the word count beyond 80 words.
    If there is no text found in the image, then there is no need to mention it.
    Always use British English spelling when not directly transcribing text from the image.
    Your output must be safe to include directly as an HTML attribute, so, for example, NEVER use ".
    You should not begin the description with any variation of "The image", nor word the description as "the object... the action... the context...", as that is awkward to read.
    Return only the description text, with no preamble, labels, or surrounding markup.
    If any detail is unclear or uncertain, omit it rather than guessing.
    Before finalising, check that the response is objective, evocative, uses British English where applicable, avoids unsafe straight double quotes, and stays within the length guidance unless needed to include important transcribed text.`,
};
