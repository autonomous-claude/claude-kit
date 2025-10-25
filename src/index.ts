// src/index.ts
import "dotenv/config";
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { initializeMcpConnections, closeMcpConnections } from "./config/mcp";
import { createImageGenerationFlow } from "./flows/image";
import { createTextToSpeechFlow } from "./flows/tts";
import { createPostTweetFlow } from "./flows/tweet";
import { createVideoWithVoiceoverFlow } from "./flows/video";

// Initialize Genkit with the Google AI plugin
export const ai = genkit({
  plugins: [googleAI()],
});

// Initialize all flows
export const imageGenerationFlow = createImageGenerationFlow(ai);
export const textToSpeechFlow = createTextToSpeechFlow(ai);
export const postTweetFlow = createPostTweetFlow(ai);
export const videoWithVoiceoverFlow = createVideoWithVoiceoverFlow(ai);

// Export MCP connection functions
export { initializeMcpConnections, closeMcpConnections };

// Auto-initialize on module load
initializeMcpConnections();

console.log("Genkit server initialized successfully!");
console.log("\nAvailable AI flows:");
console.log("- imageGenerationFlow: Generate images using Imagen");
console.log("\nMCP-powered flows:");
console.log("- textToSpeechFlow: Convert text to speech using ElevenLabs");
console.log("- postTweetFlow: Post tweets to Twitter/X");
console.log("\nComplete workflows:");
console.log(
  "- videoWithVoiceoverFlow: Generate image → TTS → Video → Post on X",
);
console.log("\nTo start the Genkit Developer UI, run:");
console.log("  npm run genkit");
