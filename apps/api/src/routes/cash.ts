import type { FastifyInstance } from "fastify";
import { requirePayment } from "../middleware/x402.js";
import { randomUUID, randomBytes, createHash } from "crypto";
import { getTopProviders, getScoredMerchantsFromDB, getMerchantFromDB, MERCHANTS_DATA } from "../services/p2p.js";
import { getUsdcMxnRate, getCachedRateInfo } from "../services/exchange-rate.js";
import { lockEscrow, releaseEscrow, refundEscrow, getTrade, EscrowLockError, getSecretByRequestId } from "../services/escrow.js";
import { createCashRequest, getCashRequest, updateCashRequestStatus } from "../services/cash-requests.js";
import { notify } from "../services/notifications.js";
import { validateOrThrow, cashAgentsQuerySchema, cashRequestSchema, ValidationError } from "../schemas/validation.js";
import { config } from "../config.js";

export { EscrowLockError };

export const MERCHANTS = MERCHANTS_DATA;

const CLAIM_BASE_URL = process.env.CLAIM_BASE_URL ?? "http://localhost:5181";

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function cashRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/cash/agents
   * x402: $0.001 USDC
   *
   * Find available cash merchants near a location.
   * Returns merchants sorted by distance, filtered by amount and online status.
   *
   * Query params:
   *   lat      — user latitude  (default: Roma Norte, CDMX)
   *   lng      — user longitude (default: Roma Norte, CDMX)
   *   amount   — MXN amount needed (default: 500)
   *   limit    — max results (default: 5)
   */
  fastify.get(
    "/api/v1/cash/agents",
    { preHandler: requirePayment({ amount: "0.001", service: "cash_agents" }) },
    async (request, reply) => {
      let validated;
      try {
        validated = validateOrThrow(cashAgentsQuerySchema, request.query);
      } catch (err) {
        if (err instanceof ValidationError) {
          return reply.status(400).send({ error: "Validation failed", details: err.message });
        }
        throw err;
      }

      const { lat, lng, amount, limit, radius: radiusKm } = validated;
      const rate = await getUsdcMxnRate();

      let results;
      let matchingEngine = "mock-v1";
      
      try {
        const dbMerchants = await getScoredMerchantsFromDB(lat, lng, amount, limit);
        if (dbMerchants.length > 0) {
          results = dbMerchants.map((p) => ({
            id: p.id,
            stellar_address: p.stellar_address,
            name: p.name,
            type: p.type,
            address: p.address,
            latitude: p.lat,
            longitude: p.lng,
            distance_km: p.distance_km,
            available_mxn: p.available_mxn,
            max_trade_mxn: p.max_trade_mxn,
            min_trade_mxn: p.min_trade_mxn,
            tier: p.tier,
            reputation: p.reputation,
            completion_rate: p.completion_rate,
            trades_completed: p.trades_completed,
            avg_time_minutes: p.avg_time_minutes,
            online: p.online,
            score: p.score,
            usdc_rate: parseFloat((1 / rate).toFixed(6)),
            amount_usdc_needed: parseFloat((amount / rate).toFixed(4)),
          }));
          matchingEngine = "p2p-v2";
        } else {
          throw new Error("No DB results");
        }
      } catch {
        const topProviders = getTopProviders({ lat, lng, amount }, limit);
        results = topProviders.map((p) => ({
          id: p.id,
          stellar_address: p.stellar_address,
          name: p.name,
          type: p.type,
          address: p.address,
          latitude: p.lat,
          longitude: p.lng,
          distance_km: p.distance_km,
          available_mxn: p.available_mxn,
          max_trade_mxn: p.max_trade_mxn,
          min_trade_mxn: p.min_trade_mxn,
          tier: p.tier,
          reputation: p.reputation,
          completion_rate: p.completion_rate,
          trades_completed: p.trades_completed,
          avg_time_minutes: p.avg_time_minutes,
          online: p.online,
          score: p.score,
          usdc_rate: parseFloat((1 / rate).toFixed(6)),
          amount_usdc_needed: parseFloat((amount / rate).toFixed(4)),
        }));
      }

      return reply.send({
        agents: results,
        count: results.length,
        query: { lat, lng, amount_mxn: amount, radius_km: radiusKm },
        usdc_mxn_rate: rate,
        network: process.env.STELLAR_NETWORK ?? "TESTNET",
        note: "Merchants from MicoPay P2P network with P2P matching engine. Rates from Stellar Horizon testnet.",
        matching_engine: matchingEngine,
      });
    }
  );

  /**
   * POST /api/v1/cash/request
   * x402: $0.01 USDC
   *
   * Initiate a USDC → MXN cash exchange with a merchant.
   * Locks USDC in an HTLC on Soroban. Returns QR code for the user to show.
   *
   * Body:
   *   merchant_address — Stellar address of the target merchant
   *   amount_mxn       — MXN amount to receive
   *   user_lat         — (optional) user location for validation
   *   user_lng         — (optional) user location for validation
   */
  fastify.post(
    "/api/v1/cash/request",
    { preHandler: requirePayment({ amount: "0.01", service: "cash_request" }) },
    async (request, reply) => {
      let validated;
      try {
        validated = validateOrThrow(cashRequestSchema, request.body ?? {});
      } catch (err) {
        if (err instanceof ValidationError) {
          return reply.status(400).send({ error: "Validation failed", details: err.message });
        }
        throw err;
      }

      const { merchant_address: merchantAddress, amount_mxn: amountMxn } = validated;

      let merchant = await getMerchantFromDB(merchantAddress);
      
      if (!merchant) {
        const fallback = MERCHANTS.find((m) => m.stellar_address === merchantAddress);
        if (fallback) {
          merchant = {
            ...fallback,
            distance_km: 0,
            score: 0,
            reputation: fallback.completion_rate,
          };
        }
      }
      
      if (!merchant) {
        return reply.status(404).send({ error: "Merchant not found in MicoPay network" });
      }
      if (!merchant.online) {
        return reply.status(409).send({ error: "Merchant is currently offline" });
      }
      if (amountMxn > merchant.available_mxn) {
        return reply.status(409).send({
          error: `Merchant only has $${merchant.available_mxn} MXN available`,
        });
      }

      const rate = await getUsdcMxnRate();
      const amountUsdc = parseFloat((amountMxn / rate).toFixed(4));

      // Generate HTLC secret — the QR payload IS the secret preimage
      const requestId  = `mcr-${randomUUID().slice(0, 8)}`;
      const secretBytes = randomBytes(32);
      const secret      = secretBytes.toString("hex");
      const secretHash  = createHash("sha256").update(secretBytes).digest("hex");
      const expiresAt   = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      const lockAmount = Math.min(amountUsdc, 1.0);
      let htlcTxHash: string;
      try {
        htlcTxHash = await lockEscrow(lockAmount, secretHash, 120);
        fastify.log.info(`Escrow locked on-chain: ${htlcTxHash}`);
      } catch (err) {
        const error = err instanceof EscrowLockError ? err : new EscrowLockError(String(err));
        fastify.log.error({ err: error, requestId }, "Failed to lock escrow funds");
        
        if (error.isRetryable) {
          return reply.status(503).send({
            error: "Blockchain temporarily unavailable",
            message: "Unable to lock funds. Please try again in a few moments.",
            retry_after: 30,
          });
        }
        
        return reply.status(500).send({
          error: "Failed to initiate transaction",
          message: "Unable to lock USDC in escrow. Please contact support.",
        });
      }

      // The QR contains ONLY the request_id — the secret is never exposed
      // Merchant scans QR → backend receives scan → verifies cash given → releases funds
      const qrPayload = `micopay://claim?request_id=${requestId}&merchant=${merchantAddress}&amount_mxn=${amountMxn}`;

      const cashRequest = {
        request_id: requestId,
        merchant_address: merchantAddress,
        merchant_name: merchant.name,
        amount_mxn: amountMxn,
        amount_usdc: amountUsdc.toFixed(4),
        htlc_secret: secret,
        htlc_secret_hash: secretHash,
        htlc_tx_hash: htlcTxHash,
        status: "pending" as const,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
        qr_payload: qrPayload,
        payer_address: request.payerAddress ?? "GUNKNOWN",
      };

      await createCashRequest(cashRequest);

      notify("cash_request", {
        request_id: requestId,
        merchant_address: merchantAddress,
        merchant_name: merchant.name,
        amount_mxn: amountMxn,
        amount_usdc: amountUsdc.toFixed(4),
        htlc_tx_hash: htlcTxHash,
        claim_url: `${CLAIM_BASE_URL}/claim/${requestId}`,
        payer_address: request.payerAddress,
      });

      fastify.log.info(
        `Cash request ${requestId}: ${request.payerAddress} → ${merchant.name} $${amountMxn} MXN`
      );

      return reply.status(201).send({
        request_id: requestId,
        status: "pending",
        merchant: {
          name: merchant.name,
          address: merchant.address,
          stellar_address: merchantAddress,
          tier: merchant.tier,
        },
        exchange: {
          amount_mxn: amountMxn,
          amount_usdc: amountUsdc.toFixed(4),
          rate_usdc_mxn: rate,
          htlc_tx_hash: htlcTxHash,
          htlc_explorer_url: `https://stellar.expert/explorer/testnet/tx/${htlcTxHash}`,
        },
        qr_payload: qrPayload,
        claim_url: `${CLAIM_BASE_URL}/claim/${requestId}`,
        instructions: `Go to ${merchant.name} at ${merchant.address}. Open the claim_url on your phone to show the QR. The merchant will give you $${amountMxn} MXN in cash and scan the QR to release the USDC.`,
        expires_at: expiresAt,
        note: "HTLC locked on Soroban. Merchant notified. USDC releases only when merchant scans QR.",
      });
    }
  );

  /**
   * GET /api/v1/cash/request/:id
   * FREE — poll status of a cash request
   */
  fastify.get("/api/v1/cash/request/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const req = await getCashRequest(id);
    if (!req) return reply.status(404).send({ error: "Request not found" });

    return reply.send({
      request_id: req.request_id,
      status: req.status,
      merchant_name: req.merchant_name,
      amount_mxn: req.amount_mxn,
      amount_usdc: req.amount_usdc,
      htlc_tx_hash: req.htlc_tx_hash,
      expires_at: req.expires_at,
    });
  });

  /**
   * POST /api/v1/cash/release
   * FREE — Release funds to buyer by presenting the secret preimage
   *
   * Body:
   *   trade_id — the HTLC trade ID
   *   secret    — the secret preimage
   */
  fastify.post("/api/v1/cash/release", async (request, reply) => {
    const { trade_id, secret } = request.body as { trade_id: string; secret: string };

    if (!trade_id || !secret) {
      return reply.status(400).send({ error: "trade_id and secret are required" });
    }

    try {
      const txHash = await releaseEscrow(trade_id, secret);
      return reply.send({
        status: "released",
        tx_hash: txHash,
        explorer_url: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
      });
    } catch (err) {
      fastify.log.error({ err, trade_id }, "Failed to release escrow");
      return reply.status(500).send({
        error: "Release failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  /**
   * POST /api/v1/cash/refund
   * FREE — Refund seller after timeout
   *
   * Body:
   *   trade_id — the HTLC trade ID
   */
  fastify.post("/api/v1/cash/refund", async (request, reply) => {
    const { trade_id } = request.body as { trade_id: string };

    if (!trade_id) {
      return reply.status(400).send({ error: "trade_id is required" });
    }

    try {
      const txHash = await refundEscrow(trade_id);
      return reply.send({
        status: "refunded",
        tx_hash: txHash,
        explorer_url: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
      });
    } catch (err) {
      fastify.log.error({ err, trade_id }, "Failed to refund escrow");
      return reply.status(500).send({
        error: "Refund failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/v1/cash/trade/:id
   * FREE — Get trade state from the escrow contract
   */
  fastify.get("/api/v1/cash/trade/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const trade = await getTrade(id);
    if (!trade) {
      return reply.status(404).send({ error: "Trade not found" });
    }

    const statusMap: Record<string, string> = {
      "0": "unknown",
      "1": "locked",
      "2": "released",
      "3": "refunded",
    };

    return reply.send({
      trade_id: id,
      seller: trade.seller,
      buyer: trade.buyer,
      amount: parseFloat(trade.amount) / 10_000_000,
      platform_fee: parseFloat(trade.platform_fee) / 10_000_000,
      status: statusMap[trade.status] ?? "unknown",
      timeout_ledger: trade.timeout_ledger,
    });
  });

  /**
   * GET /api/v1/cash/rate
   * FREE — get current USDC/MXN exchange rate from oracle
   */
  fastify.get("/api/v1/cash/rate", async (request, reply) => {
    const rate = await getUsdcMxnRate();
    const info = getCachedRateInfo();

    return reply.send({
      pair: "USDC/MXN",
      rate: parseFloat(rate.toFixed(4)),
      source: info?.source ?? "coingecko",
      age_seconds: info ? Math.round((Date.now() - info.age_ms) / 1000) : null,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /api/v1/cash/scan
   * Merchant scans a QR and confirms cash was given.
   * Releases HTLC funds to the merchant after on-chain verification.
   *
   * Body:
   *   request_id — from the QR code
   *   merchant_stellar_address — to verify merchant identity
   */
  fastify.post("/api/v1/cash/scan", async (request, reply) => {
    const { request_id, merchant_stellar_address } = request.body as {
      request_id: string;
      merchant_stellar_address: string;
    };

    if (!request_id || !merchant_stellar_address) {
      return reply.status(400).send({ error: "request_id and merchant_stellar_address required" });
    }

    const cashReq = await getCashRequest(request_id);
    if (!cashReq) {
      return reply.status(404).send({ error: "Request not found" });
    }

    if (cashReq.status === "completed") {
      return reply.status(409).send({ error: "Request already completed" });
    }

    if (cashReq.status === "expired") {
      return reply.status(410).send({ error: "Request expired" });
    }

    if (cashReq.merchant_address !== merchant_stellar_address) {
      return reply.status(403).send({ error: "Merchant address mismatch" });
    }

    const secret = await getSecretByRequestId(request_id);
    if (!secret) {
      return reply.status(500).send({ error: "Secret not found, contact support" });
    }

    const secretHash = createHash("sha256").update(Buffer.from(secret, "hex")).digest("hex");
    const tradeIdBytes = secretHash;

    let releaseTxHash: string;
    try {
      releaseTxHash = await releaseEscrow(tradeIdBytes, secret);
      await updateCashRequestStatus(request_id, "completed");
      fastify.log.info(`Released funds for request ${request_id}: ${releaseTxHash}`);
    } catch (err) {
      fastify.log.error({ err, request_id }, "Failed to release escrow");
      return reply.status(500).send({
        error: "Release failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }

    return reply.send({
      status: "completed",
      amount_mxn: cashReq.amount_mxn,
      release_tx_hash: releaseTxHash,
      explorer_url: `https://stellar.expert/explorer/testnet/tx/${releaseTxHash}`,
    });
  });
}
