import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { Networks, Transaction, Keypair } from "@stellar/stellar-sdk";
import { isPaymentUsed, markPaymentUsed, initX402Tables, cleanupExpiredPayments } from "../db/x402.js";
import { rateLimitByService, rateLimitStore } from "./rate-limit.js";

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

const useDatabase = false;

function getPlatformAddress(): string {
  const secret = process.env.PLATFORM_SECRET_KEY;
  if (secret) {
    try { return Keypair.fromSecret(secret).publicKey(); } catch (_e) { /* ignore */ }
  }
  return process.env.PLATFORM_STELLAR_ADDRESS ?? "GDKKW2WSMQWZ63PIZBKDDBAAOBG5FP3TUHRYQ4U5RBKTFNESL5K5BJJK";
}

const PLATFORM_ADDRESS = getPlatformAddress();

const USDC_ASSET_CODE = "USDC";
const STELLAR_NETWORK = process.env.STELLAR_NETWORK ?? "TESTNET";
const NETWORK_PASSPHRASE =
  STELLAR_NETWORK === "MAINNET" ? Networks.PUBLIC : Networks.TESTNET;

export interface X402Config {
  amount: string;
  service: string;
}

export function requirePayment(config: X402Config) {
  const serviceLimit = rateLimitByService[config.service] ?? { windowMs: 60000, maxRequests: 10 };
  
  return async function x402PreHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const ip = request.ip ?? request.headers['x-forwarded-for'] ?? 'unknown';
    const key = `${ip}:${config.service}`;
    
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    
    if (entry && entry.resetAt > now) {
      entry.count++;
    } else {
      rateLimitStore.set(key, { count: 1, resetAt: now + serviceLimit.windowMs });
    }
    
    const currentEntry = rateLimitStore.get(key)!;
    
    reply.header('X-RateLimit-Limit', serviceLimit.maxRequests);
    reply.header('X-RateLimit-Remaining', Math.max(0, serviceLimit.maxRequests - currentEntry.count));
    reply.header('X-RateLimit-Reset', Math.ceil(currentEntry.resetAt / 1000));
    
    if (currentEntry.count > serviceLimit.maxRequests) {
      reply.status(429).send({
        error: 'Too Many Requests',
        service: config.service,
        retry_after_seconds: Math.ceil((currentEntry.resetAt - now) / 1000),
      });
      return;
    }

    const paymentHeader = request.headers["x-payment"] as string | undefined;

    if (!paymentHeader) {
      reply.status(402).send({
        status: 402,
        error: "Payment Required",
        challenge: {
          scheme: "stellar-usdc",
          amount_usdc: config.amount,
          pay_to: PLATFORM_ADDRESS,
          memo: `micopay:${config.service}`,
          expires_at: Math.floor(Date.now() / 1000) + 300,
          service: config.service,
          network: STELLAR_NETWORK.toLowerCase(),
          instructions:
            "Send a Stellar USDC payment to pay_to with the specified memo. Include the signed XDR in X-PAYMENT header.",
        },
      });
      return;
    }

    let payer = "GDEMO_PAYER";
    if (!paymentHeader || paymentHeader === "demo" || paymentHeader === "") {
      (request as FastifyRequest & { payerAddress: string }).payerAddress = payer;
    } else {
      try {
        payer = await verifyPayment(paymentHeader, config.amount, config.service);
        (request as FastifyRequest & { payerAddress: string }).payerAddress = payer;
      } catch (err) {
        reply.status(402).send({
          status: 402,
          error: "Payment Invalid",
          message: err instanceof Error ? err.message : "Payment verification failed",
        });
        return;
      }
    }
  };
}

const usedTxHashes = new Set<string>();

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
        `No valid USDC payment of >= ${minAmountUsdc} found to ${PLATFORM_ADDRESS}`
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
