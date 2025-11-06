// src/server/http-mcp-server.ts
import express, { Request, Response } from "express";
import { mcpHost, verifyToolPayment, getPaymentRequirements } from "../config/mcp";
import { ai } from "../index";

/**
 * HTTP-based MCP Server with x402 Payment Support
 *
 * This server exposes MCP tools over HTTP with x402 payment verification.
 * Unlike standard MCP which uses stdio transport, this allows web-based
 * and agent-based clients to call tools with Solana payments.
 */

const app = express();
app.use(express.json());

/**
 * GET /tools - List available MCP tools
 */
app.get("/tools", async (req: Request, res: Response) => {
  try {
    const tools = await mcpHost.getActiveTools(ai);

    const toolsList = tools.map((tool: any) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      requiresPayment: true,
      paymentAmount: "0.01 USDC",
    }));

    res.json({
      tools: toolsList,
      paymentInfo: {
        protocol: "x402",
        network: process.env.X402_NETWORK || "devnet",
        paymentRequired: process.env.X402_REQUIRE_PAYMENT === "true",
      },
    });
  } catch (error) {
    console.error("Error listing tools:", error);
    res.status(500).json({ error: "Failed to list tools" });
  }
});

/**
 * POST /tools/:toolName/quote - Get payment requirements for a tool
 * Returns 402 with payment details
 */
app.post("/tools/:toolName/quote", async (req: Request, res: Response) => {
  const { toolName } = req.params;

  try {
    const requirements = await getPaymentRequirements(toolName);

    if (!requirements) {
      // Payment not required
      return res.json({
        paymentRequired: false,
        message: "This tool does not require payment",
      });
    }

    // Return 402 Payment Required with payment details
    res.status(402).json({
      error: "Payment Required",
      requirements,
      instructions: {
        step1: "Create a USDC transfer transaction to the recipient wallet",
        step2: "Sign the transaction with your Solana wallet",
        step3: "Serialize transaction to base64",
        step4: "Call POST /tools/:toolName/execute with X-PAYMENT header",
      },
    });
  } catch (error) {
    console.error("Error getting payment requirements:", error);
    res.status(500).json({ error: "Failed to get payment requirements" });
  }
});

/**
 * POST /tools/:toolName/execute - Execute a tool with payment verification
 *
 * Headers:
 *   X-PAYMENT: base64-encoded payment proof
 *   Content-Type: application/json
 *
 * Body:
 *   { input: <tool-specific-input> }
 */
app.post("/tools/:toolName/execute", async (req: Request, res: Response) => {
  const { toolName } = req.params;
  const { input } = req.body;
  const paymentHeader = req.headers["x-payment"] as string | undefined;

  try {
    // Verify payment
    const isPaymentValid = await verifyToolPayment(paymentHeader, toolName);

    if (!isPaymentValid) {
      // Payment required but not provided or invalid
      const requirements = await getPaymentRequirements(toolName);

      return res.status(402).json({
        error: "Payment Required",
        message: "Valid payment not provided",
        requirements,
      });
    }

    // Payment verified, execute the tool
    // Note: This is a simplified version. In production, you'd need to:
    // 1. Get the actual tool function from MCP
    // 2. Execute it with the provided input
    // 3. Return the result

    // For now, we'll use the AI to call the tool
    const tools = await mcpHost.getActiveTools(ai);
    const tool = tools.find((t: any) => t.name === toolName);

    if (!tool) {
      return res.status(404).json({ error: "Tool not found" });
    }

    // Execute tool via AI generation
    const response = await ai.generate({
      model: "googleai/gemini-2.5-flash",
      prompt: `Execute the ${toolName} tool with input: ${JSON.stringify(input)}`,
      tools: [tool],
    });

    res.json({
      success: true,
      result: response.text,
      toolName,
      paymentVerified: true,
    });
  } catch (error) {
    console.error("Error executing tool:", error);
    res.status(500).json({
      error: "Tool execution failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /health - Health check endpoint
 */
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    x402Enabled: process.env.X402_REQUIRE_PAYMENT === "true",
    network: process.env.X402_NETWORK || "devnet",
  });
});

/**
 * Start the HTTP server
 */
export function startHttpMcpServer(port: number = 3000) {
  app.listen(port, () => {
    console.log(`\n🌐 HTTP MCP Server started on port ${port}`);
    console.log(`📍 Endpoints:`);
    console.log(`   GET  /tools - List available tools`);
    console.log(`   POST /tools/:toolName/quote - Get payment requirements`);
    console.log(`   POST /tools/:toolName/execute - Execute tool with payment`);
    console.log(`   GET  /health - Health check`);

    if (process.env.X402_REQUIRE_PAYMENT === "true") {
      console.log(`\n💰 x402 Payment: ENABLED`);
      console.log(`   Network: ${process.env.X402_NETWORK || "devnet"}`);
      console.log(`   Amount: 0.01 USDC per tool call`);
    } else {
      console.log(`\nℹ️  x402 Payment: DISABLED`);
    }
  });

  return app;
}

export default app;
