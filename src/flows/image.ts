// src/flows/image.ts
import { z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import * as path from "path";
import { writeFile, ensureDir } from "../utils/file";
import { OUTPUT_DIR } from "../utils/constants";

/**
 * Image Generation Flow
 * Generates images using Google's Imagen 4 Ultra model
 * Returns file paths instead of data URLs to avoid huge responses
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
        imagePath: z.string().optional().describe("Local file path to the generated image"),
        success: z.boolean().describe("Whether the image was generated successfully"),
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

        const imageUrl = response.media?.url;

        if (!imageUrl) {
          return {
            imagePath: undefined,
            success: false,
            prompt: input.prompt,
          };
        }

        // Ensure output directory exists
        await ensureDir(OUTPUT_DIR);

        // Save data URL to file (data URLs can be massive when JSON stringified)
        const imagePath = path.join(OUTPUT_DIR, `image_${Date.now()}.jpg`);

        let imageBuffer: Buffer;
        if (imageUrl.startsWith("data:")) {
          // Extract base64 data from data URL
          const base64Data = imageUrl.split(",")[1];
          imageBuffer = Buffer.from(base64Data, "base64");
        } else {
          // If it's a regular URL, fetch it
          const response = await fetch(imageUrl);
          const arrayBuffer = await response.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
        }

        await writeFile(imagePath, imageBuffer);

        return {
          imagePath,
          success: true,
          prompt: input.prompt,
        };
      } catch (error) {
        return {
          imagePath: undefined,
          success: false,
          prompt: input.prompt,
        };
      }
    },
  );
}
