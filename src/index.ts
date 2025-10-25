// src/index.ts
import "dotenv/config";
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { initializeMcpConnections, closeMcpConnections } from "./config/mcp";
import { createImageGenerationFlow } from "./flows/image";
import { createTextToSpeechFlow } from "./flows/tts";
import { createPostTweetFlow } from "./flows/tweet";
import { createVideoWithVoiceoverFlow } from "./flows/video";
import {
  createVeoVideoFlow,
  createVeo31TextToVideoFlow,
  createVeo31FastTextToVideoFlow,
  createVeo31ImageToVideoFlow,
  createVeo31VideoToVideoFlow,
  createVeo31FastImageToVideoFlow,
  createVeo31FastVideoToVideoFlow,
} from "./flows/veo-video";

// Initialize Genkit with the Google AI plugin
export const ai = genkit({
  plugins: [googleAI()],
});

// Initialize all flows
export const imageGenerationFlow = createImageGenerationFlow(ai);
export const textToSpeechFlow = createTextToSpeechFlow(ai);
export const postTweetFlow = createPostTweetFlow(ai);
export const videoWithVoiceoverFlow = createVideoWithVoiceoverFlow(ai);

// Veo video generation flows (all variants)
export const veoVideoFlow = createVeoVideoFlow(ai); // Default: Fast variant
export const veo31TextToVideoFlow = createVeo31TextToVideoFlow(ai);
export const veo31FastTextToVideoFlow = createVeo31FastTextToVideoFlow(ai);
export const veo31ImageToVideoFlow = createVeo31ImageToVideoFlow(ai);
export const veo31VideoToVideoFlow = createVeo31VideoToVideoFlow(ai);
export const veo31FastImageToVideoFlow = createVeo31FastImageToVideoFlow(ai);
export const veo31FastVideoToVideoFlow = createVeo31FastVideoToVideoFlow(ai);

// Export MCP connection functions
export { initializeMcpConnections, closeMcpConnections };

// Auto-initialize on module load
initializeMcpConnections();

console.log("Genkit server initialized successfully!");
console.log("\n🎨 Image Generation:");
console.log("  - imageGenerationFlow: Generate images using Imagen 4");
console.log("\n🎬 Veo Video Generation (Latest models!):");
console.log("  - veoVideoFlow: Fast text-to-video (Veo 3.1 Fast) [Default]");
console.log("\n  📹 Veo 3.1 (High Quality):");
console.log("    • veo31TextToVideoFlow: Text → Video");
console.log("    • veo31ImageToVideoFlow: Image → Video");
console.log("    • veo31VideoToVideoFlow: Video Extension/Continuation");
console.log("\n  ⚡ Veo 3.1 Fast (Quick Iterations):");
console.log("    • veo31FastTextToVideoFlow: Text → Video");
console.log("    • veo31FastImageToVideoFlow: Image → Video");
console.log("    • veo31FastVideoToVideoFlow: Video Extension/Continuation");
console.log("\n🔊 MCP-powered flows:");
console.log("  - textToSpeechFlow: Convert text to speech using ElevenLabs");
console.log("  - postTweetFlow: Post tweets to Twitter/X");
console.log("\n🎥 Complete workflows:");
console.log(
  "  - videoWithVoiceoverFlow: Image → TTS → Video → Post on X",
);
console.log("\n💡 To start the Genkit Developer UI, run:");
console.log("  npm run genkit");
