// src/flows/tweet.ts
import { z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { mcpHost } from "../config/mcp";

/**
 * Post Tweet Flow (using Twitter MCP)
 * Posts a tweet to Twitter/X
 * Uses LLM with tools but extracts actual tool results for reliability
 */
export function createPostTweetFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "postTweetFlow",
      inputSchema: z.object({
        tweetContent: z.string().describe("Content of the tweet to post"),
        imagePath: z
          .string()
          .optional()
          .describe("Path to image file to attach (supports .jpg, .png, .gif, .webp)"),
        videoPath: z
          .string()
          .optional()
          .describe("Path to video file to attach (supports .mp4, .mov)"),
      }),
      outputSchema: z.object({
        success: z.boolean().describe("Whether the tweet was posted successfully"),
        tweetId: z.string().optional().describe("ID of the posted tweet"),
        result: z.string().optional().describe("Result message from Twitter"),
        error: z.string().optional().describe("Error message if failed"),
      }),
    },
    async (input: { tweetContent: string; imagePath?: string; videoPath?: string }) => {
      try {
        const mcpTools = await mcpHost.getActiveTools(ai);

        // Build prompt with media if provided
        let prompt = `Call the Twitter create_tweet tool with text: "${input.tweetContent.replace(/"/g, '\\"')}"`;

        if (input.videoPath) {
          prompt += ` and video_path: "${input.videoPath}"`;
        } else if (input.imagePath) {
          prompt += ` and image_path: "${input.imagePath}"`;
        }

        const response = await ai.generate({
          model: googleAI.model("gemini-flash-latest"),
          prompt,
          tools: mcpTools,
        });

        // Extract actual tool result from toolCalls
        if (response.toolCalls && response.toolCalls.length > 0) {
          const toolCall = response.toolCalls[0];
          const toolOutput = toolCall.output;

          const resultText = typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput);

          return {
            success: true,
            tweetId: undefined, // Twitter MCP doesn't reliably return ID in structured format
            result: resultText,
            error: undefined,
          };
        }

        return {
          success: false,
          tweetId: undefined,
          result: undefined,
          error: "No tool calls were made",
        };
      } catch (error) {
        console.error("Error in postTweetFlow:", error);
        return {
          success: false,
          tweetId: undefined,
          result: undefined,
          error: error instanceof Error ? error.message : "Failed to post tweet",
        };
      }
    },
  );
}
