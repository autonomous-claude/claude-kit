// src/server/http-server-start.ts
import "dotenv/config";
import { startHttpMcpServer } from "./http-mcp-server";
import { initializeMcpConnections } from "../config/mcp";

/**
 * Start the HTTP-based MCP server with x402 payment support
 */
async function main() {
  console.log("🚀 Starting HTTP MCP Server with x402 Payment Support\n");

  // Initialize MCP connections
  await initializeMcpConnections();

  // Start HTTP server
  const port = parseInt(process.env.HTTP_MCP_PORT || "3000", 10);
  startHttpMcpServer(port);

  console.log("\n✨ Server ready to accept requests!");
  console.log("\n📖 Documentation:");
  console.log("   Client Guide: docs/X402_CLIENT_COMPATIBILITY.md");
  console.log("   x402 Integration: docs/X402_INTEGRATION.md");
}

main().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
