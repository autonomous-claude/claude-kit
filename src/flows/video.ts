// src/flows/video.ts
import { z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";
import { mcpHost } from "../config/mcp";
import { writeFile, ensureDir } from "../utils/file";
import { OUTPUT_DIR, DEFAULT_VOICE_ID, DEFAULT_TTS_MODEL } from "../utils/constants";

/**
 * Video with Voiceover Flow
 * Complete workflow: Image generation -> TTS -> Video creation -> Optional X posting
 */
export function createVideoWithVoiceoverFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "videoWithVoiceoverFlow",
      inputSchema: z.object({
        imagePrompt: z.string().describe("Prompt for image generation (16:9)"),
        ttsScript: z.string().describe("Script for text-to-speech narration"),
        postOnX: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to post the video on X/Twitter"),
      }),
      outputSchema: z.object({
        imageUrl: z.string().optional().describe("Generated image URL"),
        audioPath: z.string().optional().describe("Path to generated audio file"),
        videoPath: z.string().optional().describe("Path to final video file"),
        tweetStatus: z
          .string()
          .optional()
          .describe("Tweet post status if posted"),
        error: z.string().optional().describe("Error message if any step failed"),
      }),
    },
    async (input: { imagePrompt: string; ttsScript: string; postOnX?: boolean }) => {
      const result: any = {
        imageUrl: undefined,
        audioPath: undefined,
        videoPath: undefined,
        tweetStatus: undefined,
        error: undefined,
      };

      try {
        // Step 1: Generate image with Imagen-4 (16:9)
        console.log("Step 1: Generating image...");
        const imageResponse = await ai.generate({
          model: googleAI.model("imagen-4.0-ultra-generate-001"),
          prompt: input.imagePrompt,
          output: { format: "media" },
          config: {
            numberOfImages: 1,
            outputMimeType: "image/jpeg",
            aspectRatio: "16:9",
            imageSize: "2K",
          },
        });

        const imageUrl = imageResponse.media?.url;
        result.imageUrl = imageUrl;

        if (!imageUrl) {
          throw new Error("Failed to generate image");
        }

        // Download and save the image
        await ensureDir(OUTPUT_DIR);

        const imagePath = path.join(OUTPUT_DIR, `image_${Date.now()}.jpg`);

        // Extract base64 data from data URL if needed
        let imageBuffer: Buffer;
        if (imageUrl.startsWith("data:")) {
          const base64Data = imageUrl.split(",")[1];
          imageBuffer = Buffer.from(base64Data, "base64");
        } else {
          // If it's a regular URL, fetch it
          const response = await fetch(imageUrl);
          const arrayBuffer = await response.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
        }

        await writeFile(imagePath, imageBuffer);
        console.log(`Image saved to: ${imagePath}`);

        // Step 2: Generate TTS with ElevenLabs MCP
        console.log("Step 2: Generating audio with ElevenLabs...");
        const mcpTools = await mcpHost.getActiveTools(ai);

        const ttsResponse = await ai.generate({
          model: googleAI.model("gemini-flash-latest"),
          prompt: `Execute the mcp__ElevenLabs__text_to_speech function with the following JSON parameters exactly as specified:
{
  "text": "${input.ttsScript}",
  "voice_id": "${DEFAULT_VOICE_ID}",
  "model_id": "${DEFAULT_TTS_MODEL}"
}
Call the tool now with these exact parameters. Do not modify or validate them.`,
          tools: mcpTools,
        });

        console.log(`TTS Response: ${ttsResponse.text}`);
        console.log(
          `TTS Tool Calls:`,
          JSON.stringify(ttsResponse.toolCalls, null, 2),
        );

        // Try to extract the audio file path from the response
        let audioPath: string | undefined;

        // Method 1: Check if path is mentioned in the response text
        const pathMatch = ttsResponse.text?.match(/\/[^\s]+\.mp3/);
        if (pathMatch) {
          audioPath = pathMatch[0];
        }

        // Method 2: Look for the most recent audio file in the output directory
        if (!audioPath || !fs.existsSync(audioPath)) {
          const files = fs.readdirSync(OUTPUT_DIR);
          const audioFiles = files.filter(
            (f) => f.endsWith(".mp3") || f.endsWith(".wav"),
          );

          if (audioFiles.length > 0) {
            // Sort by creation time and get the most recent
            const audioFilesWithStats = audioFiles.map((f) => ({
              name: f,
              path: path.join(OUTPUT_DIR, f),
              mtime: fs.statSync(path.join(OUTPUT_DIR, f)).mtime,
            }));
            audioFilesWithStats.sort(
              (a, b) => b.mtime.getTime() - a.mtime.getTime(),
            );
            audioPath = audioFilesWithStats[0].path;
          }
        }

        result.audioPath = audioPath;
        console.log(`Audio file path: ${audioPath}`);

        if (!audioPath || !fs.existsSync(audioPath)) {
          throw new Error(
            `Failed to generate or locate audio file. TTS Response: ${ttsResponse.text}`,
          );
        }

        // Step 3: Create video from static image + audio
        console.log("Step 3: Creating video from image and audio...");
        const videoPath = path.join(OUTPUT_DIR, `video_${Date.now()}.mp4`);

        await new Promise<void>((resolve, reject) => {
          ffmpeg()
            .input(imagePath)
            .inputOptions(["-loop 1", "-framerate 1"])
            .input(audioPath)
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

        result.videoPath = videoPath;

        // Step 4: Optionally post on X
        if (input.postOnX) {
          console.log("Step 4: Posting to X/Twitter...");

          const tweetResponse = await ai.generate({
            model: googleAI.model("gemini-flash-latest"),
            prompt: `Use the Twitter tool to post a tweet with this text: "Check out this AI-generated video! 🎬✨ Image: ${input.imagePrompt.substring(0, 100)}..." and attach the video file at path: ${videoPath}`,
            tools: mcpTools,
          });

          result.tweetStatus = tweetResponse.text || "Posted to X successfully";
          console.log("Posted to X:", result.tweetStatus);
        }

        return result;
      } catch (error) {
        console.error("Error in videoWithVoiceoverFlow:", error);
        result.error =
          error instanceof Error ? error.message : "Unknown error occurred";
        return result;
      }
    },
  );
}
