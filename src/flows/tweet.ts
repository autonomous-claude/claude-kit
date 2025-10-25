// src/flows/tweet.ts
import { z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { mcpHost } from "../config/mcp";

/**
 * Post Tweet Flow (using Twitter MCP)
 * Posts a tweet to Twitter/X
 */
export function createPostTweetFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "postTweetFlow",
      inputSchema: z.object({
        tweetContent: z.string().describe("Content of the tweet to post"),
        improveWithAI: z
          .boolean()
          .optional()
          .describe("Whether to improve the tweet with AI before posting"),
      }),
      outputSchema: z.string().describe("Tweet status or URL"),
    },
    async (input: { tweetContent: string; improveWithAI?: boolean }) => {
      try {
        let tweetText = input.tweetContent;

        // Get Twitter tools from MCP
        const mcpTools = await mcpHost.getActiveTools(ai);

        const response = await ai.generate({
          model: googleAI.model("gemini-flash-latest"),
          prompt: `Use the Twitter tool to post this tweet: "${tweetText}"`,
          tools: mcpTools,
        });

        return response.text || "Tweet posted successfully";
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : "Failed to post tweet"}`;
      }
    },
  );
}
