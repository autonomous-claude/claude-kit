// src/flows/combine-video.ts
import { z } from "genkit";
import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";
import { ensureDir } from "../utils/file";
import { OUTPUT_DIR } from "../utils/constants";

/**
 * Combine Image and Audio to Video Flow
 * Takes a static image and audio file, creates a video using ffmpeg
 * This is a simple, deterministic operation with no LLM involvement
 */
export function createCombineImageAudioToVideoFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "combineImageAudioToVideoFlow",
      inputSchema: z.object({
        imagePath: z.string().describe("Absolute path to the image file"),
        audioPath: z.string().describe("Absolute path to the audio file"),
      }),
      outputSchema: z.object({
        videoPath: z.string().optional().describe("Path to the generated video file"),
        success: z.boolean().describe("Whether the video was created successfully"),
        error: z.string().optional().describe("Error message if failed"),
      }),
    },
    async (input: { imagePath: string; audioPath: string }) => {
      try {
        // Validate input files exist
        if (!fs.existsSync(input.imagePath)) {
          return {
            videoPath: undefined,
            success: false,
            error: `Image file not found: ${input.imagePath}`,
          };
        }

        if (!fs.existsSync(input.audioPath)) {
          return {
            videoPath: undefined,
            success: false,
            error: `Audio file not found: ${input.audioPath}`,
          };
        }

        // Ensure output directory exists
        await ensureDir(OUTPUT_DIR);

        // Create video path
        const videoPath = path.join(OUTPUT_DIR, `video_${Date.now()}.mp4`);

        // Use ffmpeg to combine image + audio into video
        await new Promise<void>((resolve, reject) => {
          ffmpeg()
            .input(input.imagePath)
            .inputOptions(["-loop 1", "-framerate 1"])
            .input(input.audioPath)
            .outputOptions([
              "-c:v libx264",
              "-tune stillimage",
              "-c:a aac",
              "-b:a 192k",
              "-pix_fmt yuv420p",
              "-shortest",
            ])
            .output(videoPath)
            .on("end", () => {
              console.log(`Video created: ${videoPath}`);
              resolve();
            })
            .on("error", (err) => {
              console.error("FFmpeg error:", err);
              reject(err);
            })
            .run();
        });

        return {
          videoPath,
          success: true,
          error: undefined,
        };
      } catch (error) {
        console.error("Error in combineImageAudioToVideoFlow:", error);
        return {
          videoPath: undefined,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );
}
