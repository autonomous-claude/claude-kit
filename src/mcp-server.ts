#!/usr/bin/env node
/**
 * MCP Server for Genkit Flows
 * Exposes all Genkit flows as MCP tools that can be called by Claude Desktop or other MCP clients
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as flows from "./index.js";

// Initialize MCP Server
const server = new Server(
  {
    name: "genkit-flows-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools from Genkit flows
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Image Generation
      {
        name: "generate_image",
        description: "Generate images using Imagen 4. Returns local file path to the generated image.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "A detailed description of the image to generate",
            },
          },
          required: ["prompt"],
        },
      },

      // Combine Image and Audio to Video
      {
        name: "combine_image_audio_to_video",
        description: "Combine a static image and audio file into a video. Simple ffmpeg operation with no LLM involvement.",
        inputSchema: {
          type: "object",
          properties: {
            imagePath: {
              type: "string",
              description: "Absolute path to the image file",
            },
            audioPath: {
              type: "string",
              description: "Absolute path to the audio file (mp3, wav, etc.)",
            },
          },
          required: ["imagePath", "audioPath"],
        },
      },

      // Text to Speech - COMMENTED OUT: Use ElevenLabs MCP server directly
      // {
      //   name: "text_to_speech",
      //   description: "Convert text to speech using ElevenLabs",
      //   inputSchema: {
      //     type: "object",
      //     properties: {
      //       text: {
      //         type: "string",
      //         description: "Text to convert to speech",
      //       },
      //       voice_id: {
      //         type: "string",
      //         description: "Optional ElevenLabs voice ID",
      //       },
      //     },
      //     required: ["text"],
      //   },
      // },

      // Post Tweet - COMMENTED OUT: Use Twitter/X MCP server directly
      // {
      //   name: "post_tweet",
      //   description: "Post a tweet to Twitter/X with optional image or video attachment",
      //   inputSchema: {
      //     type: "object",
      //     properties: {
      //       tweetContent: {
      //         type: "string",
      //         description: "The content of the tweet to post",
      //       },
      //       imagePath: {
      //         type: "string",
      //         description: "Optional path to image file to attach (supports .jpg, .png, .gif, .webp)",
      //       },
      //       videoPath: {
      //         type: "string",
      //         description: "Optional path to video file to attach (supports .mp4, .mov)",
      //       },
      //     },
      //     required: ["tweetContent"],
      //   },
      // },

      // Veo 3.1 Text-to-Video (High Quality) - COMMENTED OUT: Using fast variant only
      // {
      //   name: "veo31_text_to_video",
      //   description: "Generate high-quality video from text using Veo 3.1 (takes longer but better quality)",
      //   inputSchema: {
      //     type: "object",
      //     properties: {
      //       prompt: {
      //         type: "string",
      //         description: "Detailed description of the video to generate",
      //       },
      //       negativePrompt: {
      //         type: "string",
      //         description: "What to avoid in the video (optional)",
      //       },
      //       aspectRatio: {
      //         type: "string",
      //         enum: ["9:16", "16:9"],
      //         description: "Video aspect ratio (default: 16:9)",
      //       },
      //       personGeneration: {
      //         type: "string",
      //         enum: ["dont_allow", "allow_adult", "allow_all"],
      //         description: "Person generation policy (default: dont_allow)",
      //       },
      //       durationSeconds: {
      //         type: "number",
      //         description: "Duration in seconds (default: 8)",
      //       },
      //       enhancePrompt: {
      //         type: "boolean",
      //         description: "Auto-enhance the prompt (default: true)",
      //       },
      //     },
      //     required: ["prompt"],
      //   },
      // },

      // Veo 3.1 Fast Text-to-Video
      {
        name: "veo31_fast_text_to_video",
        description: "Generate video quickly from text using Veo 3.1 Fast (faster iterations, shorter videos)",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "Description of the video to generate",
            },
            aspectRatio: {
              type: "string",
              enum: ["9:16", "16:9"],
              description: "Video aspect ratio (default: 16:9)",
            },
            personGeneration: {
              type: "string",
              enum: ["dont_allow", "allow_adult", "allow_all"],
              description: "Person generation policy (default: dont_allow)",
            },
          },
          required: ["prompt"],
        },
      },

      // Veo 3.1 Image-to-Video - COMMENTED OUT: Using fast variant only
      // {
      //   name: "veo31_image_to_video",
      //   description: "Animate a static image into video using Veo 3.1",
      //   inputSchema: {
      //     type: "object",
      //     properties: {
      //       imagePath: {
      //         type: "string",
      //         description: "Path to the input image file",
      //       },
      //       prompt: {
      //         type: "string",
      //         description: "Description of how the image should animate",
      //       },
      //       aspectRatio: {
      //         type: "string",
      //         enum: ["9:16", "16:9"],
      //         description: "Video aspect ratio (default: 16:9)",
      //       },
      //       personGeneration: {
      //         type: "string",
      //         enum: ["dont_allow", "allow_adult", "allow_all"],
      //         description: "Person generation policy (default: dont_allow)",
      //       },
      //       durationSeconds: {
      //         type: "number",
      //         description: "Duration in seconds (default: 8)",
      //       },
      //     },
      //     required: ["imagePath", "prompt"],
      //   },
      // },

      // Veo 3.1 Fast Image-to-Video
      {
        name: "veo31_fast_image_to_video",
        description: "Quickly animate a static image using Veo 3.1 Fast",
        inputSchema: {
          type: "object",
          properties: {
            imagePath: {
              type: "string",
              description: "Path to the input image file",
            },
            prompt: {
              type: "string",
              description: "Description of how the image should animate",
            },
            aspectRatio: {
              type: "string",
              enum: ["9:16", "16:9"],
              description: "Video aspect ratio (default: 16:9)",
            },
            personGeneration: {
              type: "string",
              enum: ["dont_allow", "allow_adult", "allow_all"],
              description: "Person generation policy (default: dont_allow)",
            },
          },
          required: ["imagePath", "prompt"],
        },
      },

      // Veo 3.1 Video Extension - COMMENTED OUT: Using fast variant only
      // {
      //   name: "veo31_video_extension",
      //   description: "Extend and continue an existing video using Veo 3.1",
      //   inputSchema: {
      //     type: "object",
      //     properties: {
      //       videoUrl: {
      //         type: "string",
      //         description: "Google API URL of the input video to extend",
      //       },
      //       prompt: {
      //         type: "string",
      //         description: "Description of how to continue/extend the video",
      //       },
      //       aspectRatio: {
      //         type: "string",
      //         enum: ["9:16", "16:9"],
      //         description: "Video aspect ratio (default: 16:9)",
      //       },
      //       personGeneration: {
      //         type: "string",
      //         enum: ["dont_allow", "allow_adult", "allow_all"],
      //         description: "Person generation policy (default: dont_allow)",
      //       },
      //     },
      //     required: ["videoUrl", "prompt"],
      //   },
      // },

      // Veo 3.1 Fast Video Extension
      {
        name: "veo31_fast_video_extension",
        description: "Quickly extend an existing video using Veo 3.1 Fast",
        inputSchema: {
          type: "object",
          properties: {
            videoUrl: {
              type: "string",
              description: "Google API URL of the input video to extend",
            },
            prompt: {
              type: "string",
              description: "Description of how to continue/extend the video",
            },
            aspectRatio: {
              type: "string",
              enum: ["9:16", "16:9"],
              description: "Video aspect ratio (default: 16:9)",
            },
            personGeneration: {
              type: "string",
              enum: ["dont_allow", "allow_adult", "allow_all"],
              description: "Person generation policy (default: dont_allow)",
            },
          },
          required: ["videoUrl", "prompt"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [{
        type: "text",
        text: "Error: No arguments provided"
      }],
      isError: true
    };
  }

  try {
    let result;

    switch (name) {
      case "generate_image":
        result = await flows.imageGenerationFlow(args);
        break;

      case "combine_image_audio_to_video":
        result = await flows.combineImageAudioToVideoFlow(args);
        break;

      // case "text_to_speech":
      //   result = await flows.textToSpeechFlow(args);
      //   break;

      // case "post_tweet":
      //   result = await flows.postTweetFlow(args);
      //   break;

      case "veo31_text_to_video":
        result = await flows.veo31TextToVideoFlow(args);
        break;

      case "veo31_fast_text_to_video":
        result = await flows.veo31FastTextToVideoFlow(args);
        break;

      case "veo31_image_to_video":
        result = await flows.veo31ImageToVideoFlow(args);
        break;

      case "veo31_fast_image_to_video":
        result = await flows.veo31FastImageToVideoFlow(args);
        break;

      case "veo31_video_extension":
        result = await flows.veo31VideoToVideoFlow(args);
        break;

      case "veo31_fast_video_extension":
        result = await flows.veo31FastVideoToVideoFlow(args);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Genkit MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
