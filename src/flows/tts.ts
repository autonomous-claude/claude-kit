// src/flows/tts.ts
import { z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { mcpHost } from "../config/mcp";
import { DEFAULT_VOICE_ID } from "../utils/constants";

/**
 * Text to Speech Flow (using ElevenLabs MCP)
 * Converts text to speech using ElevenLabs voices
 */
export function createTextToSpeechFlow(ai: any) {
  return ai.defineFlow(
    {
      name: "textToSpeechFlow",
      inputSchema: z.object({
        text: z.string().describe("Text to convert to speech"),
        voice_id: z.string().optional().describe("Voice ID to use (optional)"),
      }),
      outputSchema: z.string().describe("Path to generated audio file or status"),
    },
    async (input: { text: string; voice_id?: string }) => {
      try {
        // Get ElevenLabs tools from MCP
        const mcpTools = await mcpHost.getActiveTools(ai);

        const response = await ai.generate({
          model: googleAI.model("gemini-flash-latest"),
          prompt: `Execute mcp__ElevenLabs__text_to_speech with exact parameters:
{
  "text": "${input.text}",
  "voice_id": "${input.voice_id || DEFAULT_VOICE_ID}"
}
Use parameter name "voice_id" not "voice_name".`,
          tools: mcpTools,
        });

        return response.text || "Audio generated successfully";
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : "Failed to generate speech"}`;
      }
    },
  );
}
