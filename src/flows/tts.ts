// src/flows/tts.ts
import { z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { mcpHost } from "../config/mcp";
import { DEFAULT_VOICE_ID } from "../utils/constants";

/**
 * Text to Speech Flow (using ElevenLabs MCP)
 * Converts text to speech using ElevenLabs voices
 * Uses LLM with tools but extracts actual tool results for reliability
 */
export function createTextToSpeechFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "textToSpeechFlow",
      inputSchema: z.object({
        text: z.string().describe("Text to convert to speech"),
        voice_id: z.string().optional().describe("Voice ID to use (optional)"),
      }),
      outputSchema: z.object({
        audioPath: z.string().optional().describe("Path to generated audio file"),
        success: z.boolean().describe("Whether the audio was generated successfully"),
        error: z.string().optional().describe("Error message if failed"),
      }),
    },
    async (input: { text: string; voice_id?: string }) => {
      try {
        const mcpTools = await mcpHost.getActiveTools(ai);

        const response = await ai.generate({
          model: googleAI.model("gemini-flash-latest"),
          prompt: `Call the ElevenLabs text_to_speech tool with these exact parameters:
{
  "text": "${input.text.replace(/"/g, '\\"')}",
  "voice_id": "${input.voice_id || DEFAULT_VOICE_ID}"
}`,
          tools: mcpTools,
        });

        // Extract actual tool result from toolCalls
        if (response.toolCalls && response.toolCalls.length > 0) {
          const toolCall = response.toolCalls[0];
          const toolOutput = toolCall.output;

          // Tool output might be a string or object
          const outputText = typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput);

          // Try to extract file path
          const pathMatch = outputText.match(/(?:saved to|path|file):\s*([^\s\n]+\.mp3)/i) ||
                           outputText.match(/\/[^\s\n]+\.mp3/);

          if (pathMatch) {
            return {
              audioPath: pathMatch[1] || pathMatch[0],
              success: true,
              error: undefined,
            };
          }

          return {
            audioPath: undefined,
            success: false,
            error: `Could not extract file path from tool output: ${outputText}`,
          };
        }

        return {
          audioPath: undefined,
          success: false,
          error: "No tool calls were made",
        };
      } catch (error) {
        console.error("Error in textToSpeechFlow:", error);
        return {
          audioPath: undefined,
          success: false,
          error: error instanceof Error ? error.message : "Failed to generate speech",
        };
      }
    },
  );
}
