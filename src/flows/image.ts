// src/flows/image.ts
import { z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

/**
 * Image Generation Flow
 * Generates images using Google's Imagen 4 Ultra model
 */
export function createImageGenerationFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "imageGenerationFlow",
      inputSchema: z.object({
        prompt: z
          .string()
          .describe("A detailed description of the image to generate"),
      }),
      outputSchema: z.object({
        imageUrl: z.string().optional().describe("URL of the generated image"),
        prompt: z.string().describe("The prompt used to generate the image"),
      }),
    },
    async (input: { prompt: string }) => {
      try {
        const response = await ai.generate({
          model: googleAI.model("imagen-4.0-ultra-generate-001"),
          prompt: input.prompt,
          output: { format: "media" },
          config: {
            numberOfImages: 1,
            outputMimeType: "image/jpeg",
            aspectRatio: "16:9",
            imageSize: "2K",
          },
        });

        return {
          imageUrl: response.media?.url,
          prompt: input.prompt,
        };
      } catch (error) {
        return {
          imageUrl: undefined,
          prompt: input.prompt,
        };
      }
    },
  );
}
