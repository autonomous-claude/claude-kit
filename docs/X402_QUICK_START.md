# x402 MCP Server - Quick Start Guide

## TL;DR - How Clients Pay with Solana

Your MCP server now has **two payment models**:

### ❌ Model 1: Standard MCP (stdio) - NOT COMPATIBLE with x402
```
Claude Desktop → stdio → MCP Server → Tools
```
**Problem:** No way to pass payment headers over stdio transport.

### ✅ Model 2: HTTP MCP Server - WORKS with x402
```
Custom Client → HTTP + X-PAYMENT header → MCP Server → Tools
```
**Solution:** HTTP transport allows payment headers and Solana transactions.

## The Payment Flow (Step-by-Step)

```
┌─────────────┐                              ┌──────────────┐
│   Client    │                              │  MCP Server  │
│ (with wallet)│                             │   (yours)    │
└──────┬──────┘                              └──────┬───────┘
       │                                            │
       │ 1. POST /tools/text_to_speech/execute    │
       │ ──────────────────────────────────────►  │
       │                                            │
       │ 2. 402 Payment Required                   │
       │    + Payment details (wallet, amount)     │
       │ ◄──────────────────────────────────────  │
       │                                            │
       │ 3. Create USDC transaction                │
       │    Sign with Solana wallet                │
       │    Serialize to base64                    │
       │                                            │
       │ 4. POST /tools/text_to_speech/execute    │
       │    Header: X-PAYMENT: <base64-tx>        │
       │ ──────────────────────────────────────►  │
       │                                            │
       │                           5. Verify payment│
       │                           6. Execute tool │
       │                                            │
       │ 7. 200 OK + Tool result                   │
       │ ◄──────────────────────────────────────  │
       │                                            │
```

## What Clients Would Work?

### ✅ Clients That WILL Work

#### 1. Custom HTTP Clients
**Node.js Example:**
```typescript
import X402McpClient from "./examples/x402-client";
import { Keypair } from "@solana/web3.js";

const wallet = Keypair.generate(); // Or load from file
const client = new X402McpClient(
  "https://api.devnet.solana.com",
  wallet,
  "http://localhost:3000"
);

await client.executeToolWithPayment("text_to_speech", {
  text: "Hello!"
});
```

**Python Example:**
```python
from solders.keypair import Keypair
from x402_client import X402Client

wallet = Keypair()
client = X402Client(
    rpc_url="https://api.devnet.solana.com",
    wallet=wallet,
    server_url="http://localhost:3000"
)

client.execute_tool("text_to_speech", {"text": "Hello!"})
```

#### 2. AI Agent Frameworks

**Eliza (ai16z):**
```typescript
import { createX402Action } from "./x402-action";

const action = createX402Action({
  serverUrl: "http://localhost:3000",
  wallet: solanaWallet,
});

// Eliza automatically handles payment when calling tools
```

**LangChain:**
```python
from langchain.tools import Tool

def call_mcp_tool(text: str) -> str:
    return x402_client.execute_tool("text_to_speech", {"text": text})

tool = Tool(
    name="TextToSpeech",
    func=call_mcp_tool,
    description="Convert text to speech (costs 0.01 USDC)"
)
```

**GOAT SDK:**
```typescript
import { createToolParameters } from "@goat-sdk/core";

const tools = [
  createToolParameters({
    name: "text_to_speech",
    execute: async (params) => {
      return x402Client.executeToolWithPayment("text_to_speech", params);
    },
  }),
];
```

#### 3. Web Applications

**React + Solana Wallet Adapter:**
```typescript
import { useWallet } from "@solana/wallet-adapter-react";

function McpToolButton() {
  const { publicKey, signTransaction } = useWallet();

  async function executeWithPayment() {
    // 1. Get payment requirements
    const quote = await fetch("/api/mcp/quote");
    const { requirements } = await quote.json();

    // 2. Create transaction
    const tx = createPaymentTx(requirements);

    // 3. User signs via wallet
    const signed = await signTransaction(tx);

    // 4. Execute with payment
    const result = await fetch("/api/mcp/execute", {
      headers: {
        "X-PAYMENT": createPaymentHeader(signed)
      }
    });
  }

  return <button onClick={executeWithPayment}>Call Tool (0.01 USDC)</button>;
}
```

### ❌ Clients That WON'T Work

- ❌ Claude Desktop App
- ❌ Cursor IDE
- ❌ Cline (VSCode extension)
- ❌ Any stdio-based MCP client

**Why?** They use stdio (standard input/output) transport, which has no concept of HTTP headers or payment protocols.

## Running the Server

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# .env
X402_REQUIRE_PAYMENT=true
X402_TREASURY_WALLET=YourSolanaWalletAddressHere
X402_NETWORK=devnet
HTTP_MCP_PORT=3000
```

### 3. Start HTTP Server
```bash
npm run http-server
```

Output:
```
🌐 HTTP MCP Server started on port 3000
📍 Endpoints:
   GET  /tools - List available tools
   POST /tools/:toolName/quote - Get payment requirements
   POST /tools/:toolName/execute - Execute tool with payment
   GET  /health - Health check

💰 x402 Payment: ENABLED
   Network: devnet
   Amount: 0.01 USDC per tool call
```

## Testing with curl

### 1. List Tools
```bash
curl http://localhost:3000/tools
```

Response:
```json
{
  "tools": [
    {
      "name": "mcp__ElevenLabs__text_to_speech",
      "description": "Convert text to speech",
      "requiresPayment": true,
      "paymentAmount": "0.01 USDC"
    }
  ],
  "paymentInfo": {
    "protocol": "x402",
    "network": "devnet",
    "paymentRequired": true
  }
}
```

### 2. Get Payment Quote
```bash
curl -X POST http://localhost:3000/tools/mcp__ElevenLabs__text_to_speech/quote
```

Response (402 Payment Required):
```json
{
  "error": "Payment Required",
  "requirements": {
    "payment": {
      "recipientWallet": "...",
      "tokenAccount": "...",
      "mint": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      "amount": 10000,
      "amountUSDC": 0.01,
      "cluster": "devnet"
    }
  }
}
```

### 3. Execute with Payment (requires valid X-PAYMENT header)
```bash
curl -X POST http://localhost:3000/tools/mcp__ElevenLabs__text_to_speech/execute \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLC..." \
  -d '{"input": {"text": "Hello world"}}'
```

## Client Implementation Requirements

To build a client that works with x402, you need:

### Minimum Requirements
1. **HTTP client** - Can make POST requests with custom headers
2. **Solana wallet** - Can sign transactions
3. **USDC token account** - For making payments
4. **Base64 encoding** - For serializing transactions

### Implementation Steps
1. Call `/tools/:name/quote` to get payment requirements
2. Create USDC SPL Token transfer transaction
3. Sign transaction with your wallet
4. Serialize and base64-encode transaction
5. Create X-PAYMENT header with payment proof
6. Call `/tools/:name/execute` with payment header
7. Receive tool result

## Example Implementations

We provide complete working examples:

- **TypeScript:** [`examples/x402-client.ts`](../examples/x402-client.ts)
- **Python:** Coming soon
- **Web/React:** Coming soon

## Next Steps

1. **Start the HTTP server** - `npm run http-server`
2. **Choose your client approach** - See compatibility guide
3. **Generate test wallet** - `solana-keygen new`
4. **Fund with devnet SOL** - `solana airdrop 2`
5. **Test the flow** - Use example client or build your own

## Documentation

- **[X402_INTEGRATION.md](./X402_INTEGRATION.md)** - Server-side implementation details
- **[X402_CLIENT_COMPATIBILITY.md](./X402_CLIENT_COMPATIBILITY.md)** - Complete client guide
- **[examples/x402-client.ts](../examples/x402-client.ts)** - Working TypeScript client

## Support

Questions? Check these resources:
- [x402 Protocol](https://x402.org/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [MCP Protocol](https://modelcontextprotocol.io)
