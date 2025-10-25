// src/config/mcp.ts
import "dotenv/config";
import { createMcpHost } from "@genkit-ai/mcp";
import * as path from "path";

/**
 * Configure MCP servers for ElevenLabs and TwitterX
 */
export const mcpHost = createMcpHost({
  name: "myMcpServers",
  mcpServers: {
    // ElevenLabs MCP Server - for text-to-speech, voice cloning, etc.
    elevenlabs: {
      command: "uvx",
      args: ["elevenlabs-mcp"],
      env: {
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || "",
        ELEVENLABS_MCP_OUTPUT_MODE:
          process.env.ELEVENLABS_MCP_OUTPUT_MODE || "files",
        ELEVENLABS_MCP_BASE_PATH:
          process.env.ELEVENLABS_MCP_BASE_PATH ||
          path.join(process.cwd(), "output"),
      },
    },
    // Twitter/X MCP Server - for posting tweets, getting timelines, etc.
    twitter: {
      command: "node",
      args: [
        process.env.TWITTER_MCP_PATH || "./x-mcp-server/build/index.js",
      ],
      env: {
        TWITTER_API_KEY: process.env.TWITTER_API_KEY || "",
        TWITTER_API_SECRET: process.env.TWITTER_API_SECRET || "",
        TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN || "",
        TWITTER_ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET || "",
      },
    },
  },
});

/**
 * Initialize MCP connections
 */
export async function initializeMcpConnections() {
  console.log("Initializing MCP server connections...");
  try {
    // MCP connections are automatically managed by createMcpHost
    console.log("MCP servers configured: ElevenLabs, Twitter/X");
  } catch (error) {
    console.error("Error initializing MCP connections:", error);
  }
}

/**
 * Close MCP connections
 */
export async function closeMcpConnections() {
  console.log("Closing MCP connections...");
  await mcpHost.close();
}
