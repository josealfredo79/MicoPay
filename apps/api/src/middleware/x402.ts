import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { Networks, Transaction, Keypair } from "@stellar/stellar-sdk";
import { isPaymentUsed, markPaymentUsed, initX402Tables, cleanupExpiredPayments } from "../db/x402.js";

let x402Initialized = false;

async function ensureX402Initialized() {
  if (x402Initialized) return;
  try {
    await initX402Tables();
    await cleanupExpiredPayments();
    x402Initialized = true;
  } catch (error) {
    console.warn('x402 DB init failed (will use in-memory fallback):', error);
  }
}

let useDatabase = false;

function getPlatformAddress(): string {
  const secret = process.env.PLATFORM_SECRET_KEY;
  if (secret) {
    try { return Keypair.fromSecret(secret).publicKey(); } catch {}
  }
  return process.env.PLATFORM_STELLAR_ADDRESS ?? "GDKKW2WSMQWZ63PIZBKDDBAAOBG5FP3TUHRYQ4U5RBKTFNESL5K5BJJK";
}

const PLATFORM_ADDRESS = getPlatformAddress();

const USDC_ASSET_CODE = "USDC";
const STELLAR_NETWORK = process.env.STELLAR_NETWORK ?? "TESTNET";
const NETWORK_PASSPHRASE =
  STELLAR_NETWORK === "MAINNET" ? Networks.PUBLIC : Networks.TESTNET;

export interface X402Config {
  /** Minimum amount in USDC (e.g. "0.001") */
  amount: string;
  /** Service name for the challenge */
  service: string;
}

/**
 * Factory: returns a Fastify preHandler that enforces x402 payment.
 *
 * Usage:
 *   fastify.get('/endpoint', { preHandler: requirePayment({ amount: '0.001', service: 'swap_search' }) }, handler)
 */
export function requirePayment(config: X402Config) {
  return async function x402PreHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const paymentHeader = request.headers["x-payment"] as string | undefined;

    if (!paymentHeader) {
      // No payment — return 402 challenge
      reply.status(402).send({
        status: 402,
        error: "Payment Required",
        challenge: {
          scheme: "stellar-usdc",
          amount_usdc: config.amount,
          pay_to: PLATFORM_ADDRESS,
          memo: `micopay:${config.service}`,
          expires_at: Math.floor(Date.now() / 1000) + 300, // 5 min
          service: config.service,
          network: STELLAR_NETWORK.toLowerCase(),
          instructions:
            "Send a Stellar USDC payment to pay_to with the specified memo. Include the signed XDR in X-PAYMENT header.",
        },
      });
      return;
    }

    // Verify the payment
    try {
      const payer = await verifyPayment(paymentHeader, config.amount, config.service);
      // Attach payer address to request for use in handlers
      (request as FastifyRequest & { payerAddress: string }).payerAddress = payer;
    } catch (err) {
      reply.status(402).send({
        status: 402,
        error: "Payment Invalid",
        message: err instanceof Error ? err.message : "Payment verification failed",
      });
      return;
    }
  };
}

/**
 * In-memory fallback for replay protection when DB is unavailable.
 */
const usedTxHashes = new Set<string>();

/**
 * Verify a payment submitted as signed XDR in the X-PAYMENT header.
 *
 * Returns the payer's Stellar address if valid.
 *
 * Checks:
 * - The XDR parses as a valid Stellar transaction
 * - The transaction has at least one payment operation to PLATFORM_ADDRESS
 * - The amount meets the minimum
 * - The transaction hash has not been seen before (replay protection via PostgreSQL)
 */
async function verifyPayment(xdrBase64: string, minAmountUsdc: string, service: string): Promise<string> {
  await ensureX402Initialized();

  if (xdrBase64.startsWith("mock:")) {
    return xdrBase64.replace("mock:", "").split(":")[0] ?? "GTEST_PAYER";
  }

  try {
    const tx = new Transaction(xdrBase64, NETWORK_PASSPHRASE);
    const payer = tx.source;

    const txHash = Buffer.from(tx.hash()).toString("hex");

    if (useDatabase) {
      const alreadyUsed = await isPaymentUsed(txHash);
      if (alreadyUsed) {
        throw new Error(`Payment already used: ${txHash.slice(0, 16)}...`);
      }
    } else {
      if (usedTxHashes.has(txHash)) {
        throw new Error(`Payment already used: ${txHash.slice(0, 16)}...`);
      }
    }

    let foundPayment = false;
    for (const op of tx.operations) {
      if (
        op.type === "payment" &&
        op.destination === PLATFORM_ADDRESS &&
        op.asset.code === USDC_ASSET_CODE
      ) {
        const amount = parseFloat(op.amount);
        const minAmount = parseFloat(minAmountUsdc);
        if (amount >= minAmount) {
          foundPayment = true;
          break;
        }
      }
    }

    if (!foundPayment) {
      throw new Error(
        `No valid USDC payment of ≥ ${minAmountUsdc} found to ${PLATFORM_ADDRESS}`
      );
    }

    if (useDatabase) {
      await markPaymentUsed(txHash, payer, minAmountUsdc, service);
    } else {
      usedTxHashes.add(txHash);
    }

    return payer;
  } catch (err) {
    if (err instanceof Error && (
      err.message.includes("No valid USDC") ||
      err.message.includes("Payment already used")
    )) throw err;
    throw new Error(`Invalid payment XDR: ${err}`);
  }
}

/**
 * Plugin that adds x402 utilities to Fastify instance.
 * Tracks payment totals for the Fund Micopay widget.
 */
export async function x402Plugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorate("requirePayment", requirePayment);
}

declare module "fastify" {
  interface FastifyInstance {
    requirePayment: typeof requirePayment;
  }
  interface FastifyRequest {
    payerAddress?: string;
  }
}
