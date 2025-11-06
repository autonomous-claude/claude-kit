# x402 Payment Integration for MCP Server

This document explains the x402 payment protocol integration for the MCP (Model Context Protocol) server, enabling monetization of AI tool calls with Solana-based micropayments.

## Overview

The x402 protocol activates the HTTP 402 "Payment Required" status code, enabling any API or service to require payment before serving content. This implementation uses Solana blockchain for fast, low-cost settlements (400ms finality, ~$0.00025 per transaction).

## Payment Amount

**Default: 0.01 USDC per MCP tool call**

This symbolic amount demonstrates the micropayment capability. You can adjust the amount in `src/config/x402.ts` by modifying the `PAYMENT_AMOUNT_USDC` constant.

## Configuration

### 1. Environment Variables

Add these variables to your `.env` file:

```bash
# Enable payment requirement (set to 'true' to enable)
X402_REQUIRE_PAYMENT=true

# Treasury wallet address to receive payments (Solana wallet address)
X402_TREASURY_WALLET=YourSolanaWalletAddressHere

# Solana network: mainnet-beta, devnet, or testnet
X402_NETWORK=devnet

# Optional: Custom RPC endpoint
# X402_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
```

### 2. Generate a Solana Wallet (if needed)

For testing on devnet:

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate a new keypair
solana-keygen new --outfile ~/.config/solana/devnet.json

# Get your wallet address
solana-keygen pubkey ~/.config/solana/devnet.json

# Set to devnet
solana config set --url https://api.devnet.solana.com

# Request airdrop for testing (devnet only)
solana airdrop 2
```

Copy the wallet address to your `X402_TREASURY_WALLET` environment variable.

## Payment Flow

### Client-Side Flow

1. **Initial Request** - Client calls an MCP tool without payment
2. **402 Response** - Server returns payment requirements:

```json
{
  "status": 402,
  "message": "Payment Required",
  "requirements": {
    "payment": {
      "recipientWallet": "...",
      "tokenAccount": "...",
      "mint": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      "amount": 10000,
      "amountUSDC": 0.01,
      "cluster": "devnet",
      "message": "Payment required for MCP tool: toolName"
    }
  }
}
```

3. **Payment Creation** - Client creates USDC transfer transaction
4. **Retry with Payment** - Client retries request with `X-PAYMENT` header
5. **Verification** - Server verifies payment and executes tool
6. **200 Response** - Server returns tool result

### X-PAYMENT Header Format

The client must send a base64-encoded JSON header:

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "solana-devnet",
  "payload": {
    "serializedTransaction": "<base64-encoded-transaction>"
  }
}
```

## Server-Side Implementation

### Payment Handler

The `X402PaymentHandler` class in `src/config/x402.ts` handles:

- Creating payment requirements
- Verifying payment headers
- Simulating transactions
- Validating amounts and recipients

### MCP Integration

The MCP configuration in `src/config/mcp.ts` provides:

- `getPaymentWrappedTools()` - Returns tools with payment verification
- `getPaymentRequirements(toolName)` - Gets payment details for a tool
- `verifyToolPayment(header, toolName)` - Verifies payment for a tool call

## Usage Examples

### Enable Payment Verification

```typescript
import { getPaymentWrappedTools, verifyToolPayment } from "./config/mcp";

// In your flow
export const myFlow = ai.defineFlow(
  {
    name: "myFlow",
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (input) => {
    // Get tools with payment verification
    const mcpTools = await getPaymentWrappedTools(ai);

    const response = await ai.generate({
      model: googleAI.model("gemini-flash-latest"),
      prompt: input,
      tools: mcpTools,
    });

    return response.text;
  }
);
```

### Manual Payment Verification

```typescript
import { verifyToolPayment } from "./config/mcp";

// In an HTTP handler or middleware
const paymentHeader = req.headers["x-payment"];
const toolName = "mcp__ElevenLabs__text_to_speech";

const isValid = await verifyToolPayment(paymentHeader, toolName);

if (!isValid) {
  return res.status(402).json({
    error: "Payment Required",
    requirements: await getPaymentRequirements(toolName),
  });
}

// Proceed with tool execution
```

## Testing

### 1. Test Without Payment (Default)

```bash
# Set X402_REQUIRE_PAYMENT=false in .env
npm run dev
```

All tools work normally without payment requirement.

### 2. Test With Payment (Devnet)

```bash
# Configure .env
X402_REQUIRE_PAYMENT=true
X402_TREASURY_WALLET=<your-devnet-wallet>
X402_NETWORK=devnet

# Start server
npm run dev
```

The server will require payment headers for all MCP tool calls.

### 3. Client Testing

Create a test client that:
1. Calls tool without payment
2. Receives 402 response with payment requirements
3. Creates USDC transfer transaction
4. Signs transaction
5. Retries with X-PAYMENT header

## Production Deployment

### Security Considerations

1. **Transaction Verification** - The current implementation simulates transactions. For production:
   - Parse SPL Token transfer instructions
   - Verify transfer amount and recipient
   - Submit transaction to network
   - Confirm on-chain settlement
   - Verify token balance changes

2. **Replay Protection** - Implement transaction ID tracking to prevent replay attacks

3. **Rate Limiting** - Add rate limiting to prevent abuse

4. **Monitoring** - Monitor payment success rates and failed verifications

### Mainnet Configuration

```bash
X402_REQUIRE_PAYMENT=true
X402_TREASURY_WALLET=<your-mainnet-wallet>
X402_NETWORK=mainnet-beta
X402_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
```

### USDC Addresses

- **Mainnet**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **Devnet**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

## API Reference

### X402PaymentHandler

```typescript
class X402PaymentHandler {
  constructor(config: X402Config);

  // Create payment requirements for a tool
  createPaymentRequirements(toolName: string): Promise<PaymentRequirements>;

  // Verify payment header
  verifyPayment(
    paymentHeader: string | undefined,
    requirements: PaymentRequirements
  ): Promise<boolean>;

  // Extract payment from request headers
  extractPayment(headers: Record<string, string | undefined>): string | undefined;
}
```

### MCP Functions

```typescript
// Get tools with payment verification wrapper
getPaymentWrappedTools(ai: any): Promise<Tool[]>;

// Get payment requirements for a specific tool
getPaymentRequirements(toolName: string): Promise<PaymentRequirements | null>;

// Verify payment for a tool call
verifyToolPayment(
  paymentHeader: string | undefined,
  toolName: string
): Promise<boolean>;
```

## Troubleshooting

### Payment verification fails

- Check that `X402_TREASURY_WALLET` is a valid Solana address
- Verify the network setting matches the client's network
- Ensure the client is sending the correct USDC mint address
- Check RPC endpoint connectivity

### Transaction simulation errors

- Verify the serialized transaction is properly base64-encoded
- Check that the transaction includes a valid SPL Token transfer
- Ensure the sender has sufficient USDC balance

### Tools not requiring payment

- Confirm `X402_REQUIRE_PAYMENT=true` in `.env`
- Check that `X402_TREASURY_WALLET` is configured
- Verify the x402 handler initialized successfully (check startup logs)

## Resources

- [x402 Protocol Specification](https://x402.org/)
- [Solana Documentation](https://docs.solana.com/)
- [USDC on Solana](https://www.circle.com/en/usdc-multichain/solana)
- [MCP Protocol](https://github.com/modelcontextprotocol)

## License

This implementation is provided as-is for demonstration purposes. Modify as needed for your production use case.
