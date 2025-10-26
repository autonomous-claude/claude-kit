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
      {
        name: "generate_image",
        description: "Generate images using Imagen 4",
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
      {
        name: "text_to_speech",
        description: "Convert text to speech using ElevenLabs",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Text to convert to speech",
            },
            voice_id: {
              type: "string",
              description: "Optional voice ID",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "veo31_fast_image_to_video",
        description: "Animate images using Veo 3.1 Fast",
        inputSchema: {
          type: "object",
          properties: {
            imagePath: {
              type: "string",
              description: "Path to input image file",
            },
            prompt: {
              type: "string",
              description: "Description of how the image should animate",
            },
            aspectRatio: {
              type: "string",
              enum: ["9:16", "16:9"],
              description: "Video aspect ratio",
            },
          },
          required: ["imagePath", "prompt"],
        },
      },
      {
        name: "veo31_video_extension",
        description: "Extend and continue videos using Veo 3.1",
        inputSchema: {
          type: "object",
          properties: {
            videoUrl: {
              type: "string",
              description: "Google API URL of the input video",
            },
            prompt: {
              type: "string",
              description: "Description of how to extend the video",
            },
            aspectRatio: {
              type: "string",
              enum: ["9:16", "16:9"],
              description: "Video aspect ratio",
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
        result = await flows.imageGenerationFlow(args.prompt as string);
        break;
      case "text_to_speech":
        result = await flows.textToSpeechFlow(args);
        break;
      case "veo31_fast_image_to_video":
        result = await flows.veo31FastImageToVideoFlow(args);
        break;
      case "veo31_video_extension":
        result = await flows.veo31VideoToVideoFlow(args);
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
