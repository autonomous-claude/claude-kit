// src/flows/veo-video.ts
import { z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { writeFile, ensureDir } from "../utils/file";
import { OUTPUT_DIR } from "../utils/constants";

/**
 * Veo Video Generation Flows
 * Comprehensive flows for Veo 3.1 and 3.1-fast models
 * Supports: text-to-video, image-to-video, video extension/continuation
 */

/**
 * Helper function to download video from URL
 */
async function downloadVideo(videoUrl: string, outputPath: string): Promise<void> {
  // Try multiple env var names
  const apiKey = process.env.GEMINI_API_KEY ||
                 process.env.GOOGLE_API_KEY ||
                 process.env.GOOGLE_GENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing API key for video download. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.");
  }

  const downloadUrl = `${videoUrl}&key=${apiKey}`;
  const response = await fetch(downloadUrl);

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  const fileStream = fs.createWriteStream(outputPath);
  await pipeline(Readable.fromWeb(response.body as any), fileStream);
}

/**
 * Helper function to read and encode image to base64
 */
function encodeImageToBase64(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString("base64");
}

/**
 * Helper function to get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

// Type definitions for input schemas
type Veo31TextToVideoInput = {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: "9:16" | "16:9";
  personGeneration?: "dont_allow" | "allow_adult" | "allow_all";
  durationSeconds?: number;
  enhancePrompt?: boolean;
};

type Veo31FastTextToVideoInput = {
  prompt: string;
  aspectRatio?: "9:16" | "16:9";
  personGeneration?: "dont_allow" | "allow_adult" | "allow_all";
};

type Veo31ImageToVideoInput = {
  imagePath: string;
  prompt: string;
  aspectRatio?: "9:16" | "16:9";
  personGeneration?: "dont_allow" | "allow_adult" | "allow_all";
  durationSeconds?: number;
};

type Veo31VideoToVideoInput = {
  videoUrl: string;
  prompt: string;
  aspectRatio?: "9:16" | "16:9";
  personGeneration?: "dont_allow" | "allow_adult" | "allow_all";
};

/**
 * Flow 1: Text-to-Video with Veo 3.1 (Standard Quality)
 * Best for: High-quality video generation, detailed scenes
 */
function createVeo31TextToVideoFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "veo31TextToVideoFlow",
      inputSchema: z.object({
        prompt: z
          .string()
          .describe("Detailed description of the video scene to generate"),
        negativePrompt: z
          .string()
          .optional()
          .describe("Things to avoid in the video"),
        aspectRatio: z
          .enum(["9:16", "16:9"])
          .optional()
          .default("16:9")
          .describe("Video aspect ratio"),
        personGeneration: z
          .enum(["dont_allow", "allow_adult", "allow_all"])
          .optional()
          .default("allow_adult")
          .describe("Control person generation"),
        durationSeconds: z
          .number()
          .min(5)
          .max(8)
          .optional()
          .default(8)
          .describe("Video duration (5-8 seconds)"),
        enhancePrompt: z
          .boolean()
          .optional()
          .default(true)
          .describe("Enable automatic prompt enhancement"),
      }),
      outputSchema: z.object({
        videoPath: z.string().optional().describe("Path to generated video file"),
        videoUrl: z.string().optional().describe("Original Google API URL for the video (for reuse in video-to-video)"),
        traceId: z.string().optional().describe("Trace ID for debugging"),
        error: z.string().optional().describe("Error message if failed"),
      }),
    },
    async (input: Veo31TextToVideoInput) => {
      try {
        console.log("Starting Veo 3.1 text-to-video generation...");
        console.log(`Prompt: ${input.prompt}`);

        await ensureDir(OUTPUT_DIR);

        // Start video generation
        let { operation } = await ai.generate({
          model: googleAI.model("veo-3.1-generate-preview"),
          prompt: input.prompt,
          config: {
            negativePrompt: input.negativePrompt,
            aspectRatio: input.aspectRatio,
            personGeneration: input.personGeneration,
            durationSeconds: input.durationSeconds,
            enhancePrompt: input.enhancePrompt,
          },
        });

        if (!operation) {
          throw new Error("Expected the model to return an operation");
        }

        console.log("Video generation started. Polling for completion...");
        console.log(`Operation ID: ${operation.id}`);

        // Poll for completion
        while (!operation.done) {
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
          operation = await ai.checkOperation(operation);
          console.log(
            `Operation status: ${operation.done ? "Done" : "In Progress"}`,
          );
        }

        if (operation.error) {
          throw new Error(`Video generation failed: ${operation.error.message}`);
        }

        // Extract video from operation
        const video = operation.output?.message?.content.find((p: any) => !!p.media);
        if (!video?.media?.url) {
          throw new Error(
            "Failed to find the generated video in the operation output",
          );
        }

        // Download video
        const videoPath = path.join(OUTPUT_DIR, `veo31_${Date.now()}.mp4`);
        await downloadVideo(video.media.url, videoPath);

        console.log(`Video successfully generated: ${videoPath}`);
        console.log(`Original video URL: ${video.media.url}`);

        return {
          videoPath,
          videoUrl: video.media.url,
          traceId: operation.id,
        };
      } catch (error) {
        console.error("Error in Veo 3.1 text-to-video flow:", error);
        return {
          videoPath: undefined,
          videoUrl: undefined,
          traceId: undefined,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );
}

/**
 * Flow 2: Fast Text-to-Video with Veo 3.1 Fast
 * Best for: Quick iterations, previews, faster generation
 */
function createVeo31FastTextToVideoFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "veo31FastTextToVideoFlow",
      inputSchema: z.object({
        prompt: z
          .string()
          .describe("Description of the video scene to generate"),
        aspectRatio: z
          .enum(["9:16", "16:9"])
          .optional()
          .default("16:9")
          .describe("Video aspect ratio"),
        personGeneration: z
          .enum(["dont_allow", "allow_adult", "allow_all"])
          .optional()
          .default("allow_adult")
          .describe("Control person generation (Fast model doesn't support allow_all)"),
      }),
      outputSchema: z.object({
        videoPath: z.string().optional().describe("Path to generated video file"),
        videoUrl: z.string().optional().describe("Original Google API URL for the video (for reuse in video-to-video)"),
        traceId: z.string().optional().describe("Trace ID for debugging"),
        error: z.string().optional().describe("Error message if failed"),
      }),
    },
    async (input: Veo31FastTextToVideoInput) => {
      try {
        console.log("Starting Veo 3.1 Fast text-to-video generation...");
        console.log(`Prompt: ${input.prompt}`);

        await ensureDir(OUTPUT_DIR);

        // Start video generation
        let { operation } = await ai.generate({
          model: googleAI.model("veo-3.1-fast-generate-preview"),
          prompt: input.prompt,
          config: {
            aspectRatio: input.aspectRatio,
            personGeneration: input.personGeneration,
          },
        });

        if (!operation) {
          throw new Error("Expected the model to return an operation");
        }

        console.log("Fast video generation started. Polling for completion...");
        console.log(`Operation ID: ${operation.id}`);

        // Poll for completion
        while (!operation.done) {
          await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds (faster polling for fast model)
          operation = await ai.checkOperation(operation);
          console.log(
            `Operation status: ${operation.done ? "Done" : "In Progress"}`,
          );
        }

        if (operation.error) {
          throw new Error(`Video generation failed: ${operation.error.message}`);
        }

        // Extract video from operation
        const video = operation.output?.message?.content.find((p: any) => !!p.media);
        if (!video?.media?.url) {
          throw new Error(
            "Failed to find the generated video in the operation output",
          );
        }

        // Download video
        const videoPath = path.join(OUTPUT_DIR, `veo31fast_${Date.now()}.mp4`);
        await downloadVideo(video.media.url, videoPath);

        console.log(`Video successfully generated: ${videoPath}`);
        console.log(`Original video URL: ${video.media.url}`);

        return {
          videoPath,
          videoUrl: video.media.url,
          traceId: operation.id,
        };
      } catch (error) {
        console.error("Error in Veo 3.1 Fast text-to-video flow:", error);
        return {
          videoPath: undefined,
          videoUrl: undefined,
          traceId: undefined,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );
}

/**
 * Flow 3: Image-to-Video (First Frame) with Veo 3.1
 * Best for: Animating static images, making photos move
 */
function createVeo31ImageToVideoFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "veo31ImageToVideoFlow",
      inputSchema: z.object({
        imagePath: z
          .string()
          .describe("Path to the input image file (first frame)"),
        prompt: z
          .string()
          .describe("Description of how the image should move/animate"),
        aspectRatio: z
          .enum(["9:16", "16:9"])
          .optional()
          .default("16:9")
          .describe("Video aspect ratio (must match image aspect ratio)"),
        personGeneration: z
          .enum(["dont_allow", "allow_adult", "allow_all"])
          .optional()
          .default("allow_adult")
          .describe("Control person generation"),
        durationSeconds: z
          .number()
          .min(5)
          .max(8)
          .optional()
          .default(6)
          .describe("Video duration (5-8 seconds)"),
      }),
      outputSchema: z.object({
        videoPath: z.string().optional().describe("Path to generated video file"),
        videoUrl: z.string().optional().describe("Original Google API URL for the video (for reuse in video-to-video)"),
        traceId: z.string().optional().describe("Trace ID for debugging"),
        error: z.string().optional().describe("Error message if failed"),
      }),
    },
    async (input: Veo31ImageToVideoInput) => {
      try {
        console.log("Starting Veo 3.1 image-to-video generation...");
        console.log(`Image: ${input.imagePath}`);
        console.log(`Prompt: ${input.prompt}`);

        // Validate image file exists
        if (!fs.existsSync(input.imagePath)) {
          throw new Error(`Image file not found: ${input.imagePath}`);
        }

        await ensureDir(OUTPUT_DIR);

        // Read and encode image
        const imageBase64 = encodeImageToBase64(input.imagePath);
        const mimeType = getMimeType(input.imagePath);

        // Start video generation with image
        let { operation } = await ai.generate({
          model: googleAI.model("veo-3.1-generate-preview"),
          prompt: [
            { text: input.prompt },
            {
              media: {
                contentType: mimeType,
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
          config: {
            aspectRatio: input.aspectRatio,
            personGeneration: input.personGeneration,
            durationSeconds: input.durationSeconds,
          },
        });

        if (!operation) {
          throw new Error("Expected the model to return an operation");
        }

        console.log("Image-to-video generation started. Polling for completion...");
        console.log(`Operation ID: ${operation.id}`);

        // Poll for completion
        while (!operation.done) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          operation = await ai.checkOperation(operation);
          console.log(
            `Operation status: ${operation.done ? "Done" : "In Progress"}`,
          );
        }

        if (operation.error) {
          throw new Error(`Video generation failed: ${operation.error.message}`);
        }

        // Extract video from operation
        const video = operation.output?.message?.content.find((p: any) => !!p.media);
        if (!video?.media?.url) {
          throw new Error(
            "Failed to find the generated video in the operation output",
          );
        }

        // Download video
        const videoPath = path.join(OUTPUT_DIR, `veo31_i2v_${Date.now()}.mp4`);
        await downloadVideo(video.media.url, videoPath);

        console.log(`Video successfully generated from image: ${videoPath}`);
        console.log(`Original video URL: ${video.media.url}`);

        return {
          videoPath,
          videoUrl: video.media.url,
          traceId: operation.id,
        };
      } catch (error) {
        console.error("Error in Veo 3.1 image-to-video flow:", error);
        return {
          videoPath: undefined,
          videoUrl: undefined,
          traceId: undefined,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );
}

/**
 * Flow 4: Video Extension/Continuation with Veo 3.1
 * Best for: Extending videos, continuing video sequences
 */
function createVeo31VideoToVideoFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "veo31VideoToVideoFlow",
      inputSchema: z.object({
        videoUrl: z
          .string()
          .describe("URL of the input video (must be accessible)"),
        prompt: z
          .string()
          .describe("Description of how to extend/continue the video"),
        aspectRatio: z
          .enum(["9:16", "16:9"])
          .optional()
          .default("16:9")
          .describe("Output video aspect ratio"),
        personGeneration: z
          .enum(["dont_allow", "allow_adult", "allow_all"])
          .optional()
          .default("allow_adult")
          .describe("Control person generation"),
      }),
      outputSchema: z.object({
        videoPath: z.string().optional().describe("Path to generated video file"),
        traceId: z.string().optional().describe("Trace ID for debugging"),
        error: z.string().optional().describe("Error message if failed"),
      }),
    },
    async (input: Veo31VideoToVideoInput) => {
      try {
        console.log("Starting Veo 3.1 video extension...");
        console.log(`Input video URL: ${input.videoUrl}`);
        console.log(`Prompt: ${input.prompt}`);

        await ensureDir(OUTPUT_DIR);

        // Start video extension
        let { operation } = await ai.generate({
          model: googleAI.model("veo-3.1-generate-preview"),
          prompt: [
            { text: input.prompt },
            {
              media: {
                contentType: "video/mp4",
                url: input.videoUrl,
              },
            },
          ],
          config: {
            aspectRatio: input.aspectRatio,
            personGeneration: input.personGeneration,
          },
        });

        if (!operation) {
          throw new Error("Expected the model to return an operation");
        }

        console.log("Video extension started. Polling for completion...");
        console.log(`Operation ID: ${operation.id}`);

        // Poll for completion
        while (!operation.done) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          operation = await ai.checkOperation(operation);
          console.log(
            `Operation status: ${operation.done ? "Done" : "In Progress"}`,
          );
        }

        if (operation.error) {
          throw new Error(`Video extension failed: ${operation.error.message}`);
        }

        // Extract video from operation
        const video = operation.output?.message?.content.find((p: any) => !!p.media);
        if (!video?.media?.url) {
          throw new Error(
            "Failed to find the extended video in the operation output",
          );
        }

        // Download video
        const videoPath = path.join(OUTPUT_DIR, `veo31_extend_${Date.now()}.mp4`);
        await downloadVideo(video.media.url, videoPath);

        console.log(`Video successfully extended: ${videoPath}`);
        console.log(`Original video URL: ${video.media.url}`);

        return {
          videoPath,
          videoUrl: video.media.url,
          traceId: operation.id,
        };
      } catch (error) {
        console.error("Error in Veo 3.1 video extension flow:", error);
        return {
          videoPath: undefined,
          videoUrl: undefined,
          traceId: undefined,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );
}

/**
 * Flow 5: Fast Image-to-Video with Veo 3.1 Fast
 * Best for: Quick image animations, rapid prototyping
 */
function createVeo31FastImageToVideoFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "veo31FastImageToVideoFlow",
      inputSchema: z.object({
        imagePath: z
          .string()
          .describe("Path to the input image file"),
        prompt: z
          .string()
          .describe("Description of how the image should move/animate"),
        aspectRatio: z
          .enum(["9:16", "16:9"])
          .optional()
          .default("16:9")
          .describe("Video aspect ratio"),
        personGeneration: z
          .enum(["dont_allow", "allow_adult", "allow_all"])
          .optional()
          .default("allow_adult")
          .describe("Control person generation (Fast model doesn't support allow_all)"),
      }),
      outputSchema: z.object({
        videoPath: z.string().optional().describe("Path to generated video file"),
        videoUrl: z.string().optional().describe("Original Google API URL for the video (for reuse in video-to-video)"),
        traceId: z.string().optional().describe("Trace ID for debugging"),
        error: z.string().optional().describe("Error message if failed"),
      }),
    },
    async (input: Veo31ImageToVideoInput) => {
      try {
        console.log("Starting Veo 3.1 Fast image-to-video generation...");
        console.log(`Image: ${input.imagePath}`);
        console.log(`Prompt: ${input.prompt}`);

        // Validate image file exists
        if (!fs.existsSync(input.imagePath)) {
          throw new Error(`Image file not found: ${input.imagePath}`);
        }

        await ensureDir(OUTPUT_DIR);

        // Read and encode image
        const imageBase64 = encodeImageToBase64(input.imagePath);
        const mimeType = getMimeType(input.imagePath);

        // Start fast video generation with image
        let { operation } = await ai.generate({
          model: googleAI.model("veo-3.1-fast-generate-preview"),
          prompt: [
            { text: input.prompt },
            {
              media: {
                contentType: mimeType,
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
          config: {
            aspectRatio: input.aspectRatio,
            personGeneration: input.personGeneration,
          },
        });

        if (!operation) {
          throw new Error("Expected the model to return an operation");
        }

        console.log("Fast image-to-video generation started. Polling for completion...");
        console.log(`Operation ID: ${operation.id}`);

        // Poll for completion
        while (!operation.done) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          operation = await ai.checkOperation(operation);
          console.log(
            `Operation status: ${operation.done ? "Done" : "In Progress"}`,
          );
        }

        if (operation.error) {
          throw new Error(`Video generation failed: ${operation.error.message}`);
        }

        // Extract video from operation
        const video = operation.output?.message?.content.find((p: any) => !!p.media);
        if (!video?.media?.url) {
          throw new Error(
            "Failed to find the generated video in the operation output",
          );
        }

        // Download video
        const videoPath = path.join(OUTPUT_DIR, `veo31fast_i2v_${Date.now()}.mp4`);
        await downloadVideo(video.media.url, videoPath);

        console.log(`Video successfully generated from image: ${videoPath}`);
        console.log(`Original video URL: ${video.media.url}`);

        return {
          videoPath,
          videoUrl: video.media.url,
          traceId: operation.id,
        };
      } catch (error) {
        console.error("Error in Veo 3.1 Fast image-to-video flow:", error);
        return {
          videoPath: undefined,
          videoUrl: undefined,
          traceId: undefined,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );
}

/**
 * Flow 6: Fast Video Extension/Continuation with Veo 3.1 Fast
 * Best for: Quick video extensions, rapid iterations
 */
function createVeo31FastVideoToVideoFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "veo31FastVideoToVideoFlow",
      inputSchema: z.object({
        videoUrl: z
          .string()
          .describe("URL of the input video"),
        prompt: z
          .string()
          .describe("Description of how to extend/continue the video"),
        aspectRatio: z
          .enum(["9:16", "16:9"])
          .optional()
          .default("16:9")
          .describe("Output video aspect ratio"),
        personGeneration: z
          .enum(["dont_allow", "allow_adult", "allow_all"])
          .optional()
          .default("allow_adult")
          .describe("Control person generation"),
      }),
      outputSchema: z.object({
        videoPath: z.string().optional().describe("Path to generated video file"),
        traceId: z.string().optional().describe("Trace ID for debugging"),
        error: z.string().optional().describe("Error message if failed"),
      }),
    },
    async (input: Veo31VideoToVideoInput) => {
      try {
        console.log("Starting Veo 3.1 Fast video extension...");
        console.log(`Input video URL: ${input.videoUrl}`);
        console.log(`Prompt: ${input.prompt}`);

        await ensureDir(OUTPUT_DIR);

        // Start fast video extension
        let { operation } = await ai.generate({
          model: googleAI.model("veo-3.1-fast-generate-preview"),
          prompt: [
            { text: input.prompt },
            {
              media: {
                contentType: "video/mp4",
                url: input.videoUrl,
              },
            },
          ],
          config: {
            aspectRatio: input.aspectRatio,
            personGeneration: input.personGeneration,
          },
        });

        if (!operation) {
          throw new Error("Expected the model to return an operation");
        }

        console.log("Fast video extension started. Polling for completion...");
        console.log(`Operation ID: ${operation.id}`);

        // Poll for completion
        while (!operation.done) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          operation = await ai.checkOperation(operation);
          console.log(
            `Operation status: ${operation.done ? "Done" : "In Progress"}`,
          );
        }

        if (operation.error) {
          throw new Error(`Video extension failed: ${operation.error.message}`);
        }

        // Extract video from operation
        const video = operation.output?.message?.content.find((p: any) => !!p.media);
        if (!video?.media?.url) {
          throw new Error(
            "Failed to find the extended video in the operation output",
          );
        }

        // Download video
        const videoPath = path.join(OUTPUT_DIR, `veo31fast_extend_${Date.now()}.mp4`);
        await downloadVideo(video.media.url, videoPath);

        console.log(`Video successfully extended: ${videoPath}`);
        console.log(`Original video URL: ${video.media.url}`);

        return {
          videoPath,
          videoUrl: video.media.url,
          traceId: operation.id,
        };
      } catch (error) {
        console.error("Error in Veo 3.1 Fast video extension flow:", error);
        return {
          videoPath: undefined,
          videoUrl: undefined,
          traceId: undefined,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );
}

/**
 * Main factory function to create the default Veo video flow
 * This creates a fast text-to-video flow with a simplified interface
 */
function createVeoVideoFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "veoVideoFlow",
      inputSchema: z.object({
        prompt: z
          .string()
          .describe("Description of the video scene to generate"),
        aspectRatio: z
          .enum(["9:16", "16:9"])
          .optional()
          .default("16:9")
          .describe("Video aspect ratio"),
      }),
      outputSchema: z.object({
        videoPath: z.string().optional().describe("Path to generated video file"),
        videoUrl: z.string().optional().describe("Original Google API URL for the video (for reuse in video-to-video)"),
        traceId: z.string().optional().describe("Trace ID for debugging"),
        error: z.string().optional().describe("Error message if failed"),
      }),
    },
    async (input: { prompt: string; aspectRatio?: "9:16" | "16:9" }) => {
      try {
        console.log("Starting Veo video generation (Fast)...");
        console.log(`Prompt: ${input.prompt}`);

        await ensureDir(OUTPUT_DIR);

        // Use Veo 3.1 Fast for quick generation
        let { operation } = await ai.generate({
          model: googleAI.model("veo-3.1-fast-generate-preview"),
          prompt: input.prompt,
          config: {
            aspectRatio: input.aspectRatio || "16:9",
            personGeneration: "allow_all",
          },
        });

        if (!operation) {
          throw new Error("Expected the model to return an operation");
        }

        console.log("Video generation started. Polling for completion...");

        // Poll for completion
        while (!operation.done) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          operation = await ai.checkOperation(operation);
        }

        if (operation.error) {
          throw new Error(`Video generation failed: ${operation.error.message}`);
        }

        // Extract video from operation
        const video = operation.output?.message?.content.find((p: any) => !!p.media);
        if (!video?.media?.url) {
          throw new Error(
            "Failed to find the generated video in the operation output",
          );
        }

        // Download video
        const videoPath = path.join(OUTPUT_DIR, `veo_${Date.now()}.mp4`);
        await downloadVideo(video.media.url, videoPath);

        console.log(`Video successfully generated: ${videoPath}`);
        console.log(`Original video URL: ${video.media.url}`);

        return {
          videoPath,
          videoUrl: video.media.url,
          traceId: operation.id,
        };
      } catch (error) {
        console.error("Error in Veo video flow:", error);
        return {
          videoPath: undefined,
          videoUrl: undefined,
          traceId: undefined,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );
}

/**
 * Export all flow creators for flexibility
 */
export {
  createVeoVideoFlow,
  createVeo31TextToVideoFlow,
  createVeo31FastTextToVideoFlow,
  createVeo31ImageToVideoFlow,
  createVeo31VideoToVideoFlow,
  createVeo31FastImageToVideoFlow,
  createVeo31FastVideoToVideoFlow,
};
