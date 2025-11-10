// src/config/x402.ts
import "dotenv/config";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

/**
 * x402 Payment Handler for MCP Server
 * Implements payment verification for tool calls requiring 0.01 SOL in USDC
 */

// USDC mint addresses for Solana
const USDC_MINT_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

// Payment amount: 0.01 SOL worth of USDC (adjust based on current SOL price)
// For devnet/testing, we'll use a symbolic amount
const PAYMENT_AMOUNT_USDC = 10000; // 0.01 USDC (6 decimals)

export interface X402Config {
  network: "mainnet-beta" | "devnet" | "testnet";
  treasuryWallet: string;
  rpcEndpoint?: string;
  requirePayment: boolean; // Enable/disable payment requirement
}

export interface X402PaymentHeader {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    serializedTransaction: string;
  };
}

export interface PaymentRequirements {
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

export class X402PaymentHandler {
  private connection: Connection;
  private config: X402Config;
  private treasuryPublicKey: PublicKey;
  private usdcMint: PublicKey;

  constructor(config: X402Config) {
    this.config = config;

    // Set up Solana connection
    const rpcEndpoint =
      config.rpcEndpoint ||
      (config.network === "mainnet-beta"
        ? "https://api.mainnet-beta.solana.com"
        : `https://api.${config.network}.solana.com`);

    this.connection = new Connection(rpcEndpoint, "confirmed");
    this.treasuryPublicKey = new PublicKey(config.treasuryWallet);
    this.usdcMint =
      config.network === "mainnet-beta" ? USDC_MINT_MAINNET : USDC_MINT_DEVNET;
  }

  /**
   * Create payment requirements for x402 response
   */
  async createPaymentRequirements(
    toolName: string
  ): Promise<PaymentRequirements> {
    const tokenAccount = await getAssociatedTokenAddress(
      this.usdcMint,
      this.treasuryPublicKey
    );

    return {
      payment: {
        recipientWallet: this.treasuryPublicKey.toString(),
        tokenAccount: tokenAccount.toString(),
        mint: this.usdcMint.toString(),
        amount: PAYMENT_AMOUNT_USDC,
        amountUSDC: PAYMENT_AMOUNT_USDC / 1_000_000, // Convert to USDC
        cluster: this.config.network,
        message: `Payment required for MCP tool: ${toolName}`,
      },
    };
  }

  /**
   * Verify x402 payment header
   */
  async verifyPayment(
    paymentHeader: string | undefined,
    requirements: PaymentRequirements
  ): Promise<boolean> {
    if (!this.config.requirePayment) {
      // Payment requirement disabled
      return true;
    }

    if (!paymentHeader) {
      return false;
    }

    try {
      // Decode base64 payment header
      const decodedHeader = Buffer.from(paymentHeader, "base64").toString(
        "utf-8"
      );
      const paymentData: X402PaymentHeader = JSON.parse(decodedHeader);

      // Verify x402 version and network
      if (paymentData.x402Version !== 1) {
        console.error("Invalid x402 version:", paymentData.x402Version);
        return false;
      }

      const expectedNetwork =
        this.config.network === "mainnet-beta"
          ? "solana-mainnet"
          : `solana-${this.config.network}`;

      if (paymentData.network !== expectedNetwork) {
        console.error(
          `Network mismatch: expected ${expectedNetwork}, got ${paymentData.network}`
        );
        return false;
      }

      // Deserialize and verify transaction
      const txBuffer = Buffer.from(
        paymentData.payload.serializedTransaction,
        "base64"
      );
      const transaction = Transaction.from(txBuffer);

      // Simulate transaction to verify it's valid
      const simulation = await this.connection.simulateTransaction(transaction);

      if (simulation.value.err) {
        console.error("Transaction simulation failed:", simulation.value.err);
        return false;
      }

      // TODO: In production, you should:
      // 1. Parse SPL Token transfer instruction to verify amount and recipient
      // 2. Submit transaction to network
      // 3. Confirm transaction on-chain
      // 4. Verify token balance changes

      console.log("Payment verification simulated successfully");
      return true;
    } catch (error) {
      console.error("Error verifying payment:", error);
      return false;
    }
  }

  /**
   * Extract payment header from request headers
   */
  extractPayment(headers: Record<string, string | undefined>): string | undefined {
    return headers["x-payment"] || headers["X-Payment"];
  }
}

/**
 * Create x402 payment handler from environment variables
 */
export function createX402Handler(): X402PaymentHandler | null {
  const treasuryWallet = process.env.X402_TREASURY_WALLET;
  const network = (process.env.X402_NETWORK || "devnet") as
    | "mainnet-beta"
    | "devnet"
    | "testnet";
  const requirePayment = process.env.X402_REQUIRE_PAYMENT === "true";

  if (!treasuryWallet) {
    console.warn(
      "X402_TREASURY_WALLET not configured, payment verification disabled"
    );
    return null;
  }

  return new X402PaymentHandler({
    network,
    treasuryWallet,
    rpcEndpoint: process.env.X402_RPC_ENDPOINT,
    requirePayment,
  });
}

/**
 * Middleware wrapper for MCP tools with x402 payment requirement
 */
export function withX402Payment<T extends (...args: any[]) => any>(
  toolName: string,
  handler: T,
  paymentHandler: X402PaymentHandler | null
): T {
  if (!paymentHandler || !paymentHandler['config'].requirePayment) {
    // Payment not required, return original handler
    return handler;
  }

  return (async (...args: any[]) => {
    // Extract payment header from context (if available)
    // Note: In the MCP context, we might need to adjust this based on how
    // headers are passed to tool handlers
    const context = args[args.length - 1];
    const paymentHeader =
      context?.headers?.["x-payment"] || context?.headers?.["X-Payment"];

    // Create payment requirements
    const requirements = await paymentHandler.createPaymentRequirements(
      toolName
    );

    // Verify payment
    const verified = await paymentHandler.verifyPayment(
      paymentHeader,
      requirements
    );

    if (!verified) {
      // Return 402 Payment Required response
      throw new Error(
        JSON.stringify({
          status: 402,
          message: "Payment Required",
          requirements,
        })
      );
    }

    // Payment verified, execute original handler
    return handler(...args);
  }) as T;
}
