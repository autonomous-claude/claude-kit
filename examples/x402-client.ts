// examples/x402-client.ts
/**
 * Example x402-aware MCP Client for Solana Payments
 *
 * This demonstrates how to interact with the HTTP-based MCP server
 * with x402 payment verification using Solana/USDC.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
} from "@solana/spl-token";
import fetch from "node-fetch";

interface PaymentRequirements {
  payment: {
    recipientWallet: string;
    tokenAccount: string;
    mint: string;
    amount: number;
    amountUSDC: number;
    cluster: string;
    message: string;
  };
}

interface X402PaymentHeader {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    serializedTransaction: string;
  };
}

export class X402McpClient {
  private connection: Connection;
  private wallet: Keypair;
  private serverUrl: string;

  constructor(
    rpcEndpoint: string,
    walletKeypair: Keypair,
    serverUrl: string = "http://localhost:3000"
  ) {
    this.connection = new Connection(rpcEndpoint, "confirmed");
    this.wallet = walletKeypair;
    this.serverUrl = serverUrl;
  }

  /**
   * List available tools from the server
   */
  async listTools() {
    const response = await fetch(`${this.serverUrl}/tools`);
    const data = await response.json();
    return data;
  }

  /**
   * Get payment requirements for a tool
   */
  async getPaymentQuote(toolName: string): Promise<PaymentRequirements> {
    const response = await fetch(`${this.serverUrl}/tools/${toolName}/quote`, {
      method: "POST",
    });

    if (response.status !== 402) {
      const data = await response.json();
      throw new Error(`Expected 402, got ${response.status}: ${JSON.stringify(data)}`);
    }

    const data = await response.json();
    return data.requirements;
  }

  /**
   * Create and sign a USDC payment transaction
   */
  async createPaymentTransaction(
    requirements: PaymentRequirements
  ): Promise<string> {
    const { recipientWallet, tokenAccount, mint, amount } = requirements.payment;

    const mintPublicKey = new PublicKey(mint);
    const recipientPublicKey = new PublicKey(recipientWallet);
    const recipientTokenAccount = new PublicKey(tokenAccount);

    // Get sender's token account
    const senderTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      this.wallet.publicKey
    );

    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      senderTokenAccount,
      recipientTokenAccount,
      this.wallet.publicKey,
      amount
    );

    // Create transaction
    const transaction = new Transaction();
    transaction.add(transferInstruction);

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.wallet.publicKey;

    // Sign transaction
    transaction.sign(this.wallet);

    // Serialize to base64
    const serialized = transaction.serialize();
    return serialized.toString("base64");
  }

  /**
   * Create X-PAYMENT header
   */
  createPaymentHeader(
    serializedTransaction: string,
    network: string
  ): string {
    const paymentData: X402PaymentHeader = {
      x402Version: 1,
      scheme: "exact",
      network: network.includes("mainnet") ? "solana-mainnet" : `solana-${network}`,
      payload: {
        serializedTransaction,
      },
    };

    return Buffer.from(JSON.stringify(paymentData)).toString("base64");
  }

  /**
   * Execute a tool with payment
   */
  async executeToolWithPayment(toolName: string, input: any) {
    console.log(`\n🔧 Executing tool: ${toolName}`);
    console.log(`📥 Input:`, input);

    // Step 1: Get payment requirements
    console.log(`\n💰 Step 1: Getting payment requirements...`);
    const requirements = await this.getPaymentQuote(toolName);
    console.log(`   Amount: ${requirements.payment.amountUSDC} USDC`);
    console.log(`   Recipient: ${requirements.payment.recipientWallet}`);

    // Step 2: Create payment transaction
    console.log(`\n💳 Step 2: Creating payment transaction...`);
    const serializedTx = await this.createPaymentTransaction(requirements);
    console.log(`   Transaction created and signed`);

    // Step 3: Create X-PAYMENT header
    const paymentHeader = this.createPaymentHeader(
      serializedTx,
      requirements.payment.cluster
    );

    // Step 4: Execute tool with payment
    console.log(`\n⚡ Step 3: Executing tool with payment...`);
    const response = await fetch(
      `${this.serverUrl}/tools/${toolName}/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": paymentHeader,
        },
        body: JSON.stringify({ input }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Tool execution failed: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log(`\n✅ Tool executed successfully!`);
    console.log(`📤 Result:`, result);

    return result;
  }

  /**
   * Check wallet balance
   */
  async checkBalance(mintAddress: string): Promise<number> {
    const mintPublicKey = new PublicKey(mintAddress);
    const tokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      this.wallet.publicKey
    );

    try {
      const accountInfo = await getAccount(this.connection, tokenAccount);
      return Number(accountInfo.amount);
    } catch (error) {
      console.error("Error checking balance:", error);
      return 0;
    }
  }
}

/**
 * Example usage
 */
async function main() {
  // Load wallet from environment or create new one
  const walletPrivateKey = process.env.SOLANA_PRIVATE_KEY;
  if (!walletPrivateKey) {
    console.error("Please set SOLANA_PRIVATE_KEY environment variable");
    process.exit(1);
  }

  const wallet = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(walletPrivateKey))
  );

  // Initialize client
  const client = new X402McpClient(
    process.env.SOLANA_RPC_ENDPOINT || "https://api.devnet.solana.com",
    wallet,
    process.env.MCP_SERVER_URL || "http://localhost:3000"
  );

  console.log("🚀 x402 MCP Client Example");
  console.log(`📍 Server: ${process.env.MCP_SERVER_URL || "http://localhost:3000"}`);
  console.log(`💼 Wallet: ${wallet.publicKey.toString()}`);

  // List available tools
  console.log("\n📋 Listing available tools...");
  const tools = await client.listTools();
  console.log(`Found ${tools.tools.length} tools:`);
  tools.tools.forEach((tool: any) => {
    console.log(`   - ${tool.name}: ${tool.description}`);
  });

  // Execute a tool with payment
  const toolName = "mcp__ElevenLabs__text_to_speech";
  const input = {
    text: "Hello from the x402 payment protocol!",
    voice_id: "SOYHLrjzK2X1ezoPC6cr",
  };

  await client.executeToolWithPayment(toolName, input);
}

// Run example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default X402McpClient;
