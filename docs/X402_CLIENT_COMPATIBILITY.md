# x402 MCP Client Compatibility Guide

## Overview

This document explains which MCP clients can work with x402 payment verification and how to set them up.

## 🚨 Standard MCP Clients - NOT Compatible

These clients **will NOT work** with x402 out of the box:

### ❌ Claude Desktop
- Uses stdio transport (not HTTP)
- No Solana wallet integration
- No x402 payment support

### ❌ Cursor IDE
- Uses stdio transport
- No payment capabilities
- No wallet integration

### ❌ Cline (VSCode Extension)
- MCP stdio transport only
- No blockchain integration

### ❌ Standard MCP Protocol Clients
- MCP spec uses JSON-RPC over stdio/SSE
- No native support for HTTP 402 status codes
- No payment header mechanism

## ✅ Compatible Client Approaches

### 1. HTTP-Based Custom Clients (RECOMMENDED)

**What works:** Any client that can make HTTP requests with custom headers and Solana wallet integration.

**Requirements:**
- HTTP client (fetch, axios, etc.)
- Solana wallet (via @solana/web3.js)
- USDC token account
- Understanding of x402 payment flow

**Example Implementations:**

#### Node.js/TypeScript Client
See [`examples/x402-client.ts`](../examples/x402-client.ts) for a complete implementation.

```typescript
import X402McpClient from "./examples/x402-client";
import { Keypair } from "@solana/web3.js";

const wallet = Keypair.fromSecretKey(/* your key */);
const client = new X402McpClient(
  "https://api.devnet.solana.com",
  wallet,
  "http://localhost:3000"
);

// List tools
const tools = await client.listTools();

// Execute tool with automatic payment
await client.executeToolWithPayment("toolName", { input: "data" });
```

#### Python Client
```python
import base64
import json
import requests
from solders.keypair import Keypair
from solders.transaction import Transaction
from spl.token.instructions import transfer_checked, TransferCheckedParams

class X402McpClient:
    def __init__(self, rpc_url, wallet_keypair, server_url):
        self.rpc_url = rpc_url
        self.wallet = wallet_keypair
        self.server_url = server_url

    def execute_tool(self, tool_name, input_data):
        # 1. Get payment requirements
        quote_response = requests.post(
            f"{self.server_url}/tools/{tool_name}/quote"
        )
        requirements = quote_response.json()["requirements"]

        # 2. Create payment transaction
        tx = self.create_payment_transaction(requirements)

        # 3. Sign and serialize
        tx.sign(self.wallet)
        serialized = base64.b64encode(bytes(tx)).decode()

        # 4. Create X-PAYMENT header
        payment_header = base64.b64encode(json.dumps({
            "x402Version": 1,
            "scheme": "exact",
            "network": f"solana-{requirements['payment']['cluster']}",
            "payload": {"serializedTransaction": serialized}
        }).encode()).decode()

        # 5. Execute tool
        response = requests.post(
            f"{self.server_url}/tools/{tool_name}/execute",
            headers={"X-PAYMENT": payment_header},
            json={"input": input_data}
        )

        return response.json()
```

### 2. AI Agent Frameworks with Solana Support

**Compatible Frameworks:**

#### ✅ AutoGPT with Solana Plugin
```python
# AutoGPT can be configured to use HTTP APIs with custom authentication
# Add Solana wallet plugin for payment signing
```

#### ✅ LangChain with Custom HTTP Tool
```python
from langchain.tools import Tool
from langchain.agents import initialize_agent

mcp_tool = Tool(
    name="MCPTool",
    func=lambda x: x402_client.execute_tool("toolName", x),
    description="Execute MCP tool with x402 payment"
)

agent = initialize_agent([mcp_tool], llm, agent="zero-shot-react-description")
```

#### ✅ CrewAI with Custom Tools
```python
from crewai import Agent, Task, Crew
from crewai_tools import BaseTool

class X402McpTool(BaseTool):
    def _run(self, input: str) -> str:
        return x402_client.execute_tool(self.tool_name, input)

agent = Agent(
    role="AI Assistant",
    tools=[X402McpTool(tool_name="text_to_speech")]
)
```

### 3. Web-Based AI Applications

**React/Next.js Example:**

```typescript
// app/components/McpClient.tsx
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";

export function McpClient() {
  const { publicKey, signTransaction } = useWallet();

  async function executeTool(toolName: string, input: any) {
    // 1. Get payment requirements
    const quote = await fetch(`/api/mcp/tools/${toolName}/quote`, {
      method: "POST",
    });
    const { requirements } = await quote.json();

    // 2. Create transaction
    const tx = createPaymentTransaction(requirements);

    // 3. Request user signature via wallet
    const signed = await signTransaction(tx);
    const serialized = signed.serialize().toString("base64");

    // 4. Execute with payment
    const result = await fetch(`/api/mcp/tools/${toolName}/execute`, {
      method: "POST",
      headers: {
        "X-PAYMENT": btoa(JSON.stringify({
          x402Version: 1,
          scheme: "exact",
          network: "solana-devnet",
          payload: { serializedTransaction: serialized },
        })),
      },
      body: JSON.stringify({ input }),
    });

    return result.json();
  }

  return (
    <button onClick={() => executeTool("text_to_speech", { text: "Hello" })}>
      Generate Speech (Pay 0.01 USDC)
    </button>
  );
}
```

### 4. Blockchain-Native AI Agents

#### ✅ Eliza (ai16z)
```typescript
// Eliza can be configured with Solana wallet and HTTP actions
import { createX402Action } from "./x402-action";

const mcpAction = createX402Action({
  name: "CALL_MCP_TOOL",
  wallet: solanaWallet,
  serverUrl: "http://localhost:3000",
});

// Eliza will automatically handle payment when calling MCP tools
```

#### ✅ GOAT SDK
```typescript
import { createToolParameters } from "@goat-sdk/core";
import { solana } from "@goat-sdk/wallet-solana";

const tools = [
  createToolParameters({
    name: "mcp_text_to_speech",
    description: "Convert text to speech with payment",
    execute: async (params) => {
      return x402Client.executeToolWithPayment("text_to_speech", params);
    },
  }),
];
```

## 🔧 Setting Up the HTTP MCP Server

To enable x402 payments with HTTP access:

### 1. Install Express Dependency

```bash
npm install express @types/express
```

### 2. Start HTTP Server

Create a server entry point:

```typescript
// src/server/index.ts
import { startHttpMcpServer } from "./http-mcp-server";

const PORT = process.env.HTTP_MCP_PORT || 3000;
startHttpMcpServer(PORT);
```

Run the server:

```bash
# Add to package.json scripts
"http-server": "tsx src/server/index.ts"

# Start the server
npm run http-server
```

### 3. Test with curl

```bash
# List tools
curl http://localhost:3000/tools

# Get payment quote
curl -X POST http://localhost:3000/tools/toolName/quote

# Execute with payment (requires valid X-PAYMENT header)
curl -X POST http://localhost:3000/tools/toolName/execute \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <base64-payment-proof>" \
  -d '{"input": {"text": "Hello"}}'
```

## 💡 Integration Patterns

### Pattern 1: Direct HTTP Client
Best for: Custom applications, AI agent frameworks

```
Your App → HTTP MCP Server → MCP Tools
         ↓ (with X-PAYMENT header)
```

### Pattern 2: Proxy/Gateway
Best for: Adding x402 to existing MCP setups

```
MCP Client → x402 Proxy → HTTP MCP Server → MCP Tools
          ↓ (stdio)     ↓ (HTTP + payment)
```

### Pattern 3: Embedded in AI Agent
Best for: Autonomous agents, blockchain-native apps

```
AI Agent (with Solana wallet) → HTTP MCP Server → MCP Tools
                              ↓ (automatic payment)
```

## 🛠️ Building Your Own Client

### Minimum Requirements

1. **HTTP Client**: Make POST requests with custom headers
2. **Solana Wallet**: Sign USDC transfer transactions
3. **Payment Flow**:
   ```
   a. POST /tools/:name/quote → Get payment requirements
   b. Create USDC transfer transaction
   c. Sign transaction with wallet
   d. Serialize to base64
   e. POST /tools/:name/execute with X-PAYMENT header
   ```

### Client Checklist

- [ ] Can make HTTP requests
- [ ] Has Solana wallet integration (@solana/web3.js or equivalent)
- [ ] Can create SPL Token transfers
- [ ] Can sign transactions
- [ ] Can base64 encode JSON and transactions
- [ ] Can add custom HTTP headers

## 📚 Example Clients

We provide example implementations:

1. **Node.js/TypeScript** - [`examples/x402-client.ts`](../examples/x402-client.ts)
2. **Python** - Coming soon
3. **Web/React** - Coming soon
4. **Eliza Agent** - Coming soon

## 🔗 Resources

- [x402 Protocol Specification](https://x402.org/)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token Documentation](https://spl.solana.com/token)
- [MCP Protocol Specification](https://modelcontextprotocol.io)

## 🤝 Contributing

Have you built a client for x402 MCP? We'd love to add your example!
Submit a PR with your implementation in the `examples/` directory.
