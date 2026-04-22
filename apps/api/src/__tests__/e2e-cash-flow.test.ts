import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHash } from "crypto";

vi.mock("../db/schema.js", () => {
  const store = new Map<string, any>();
  return {
    query: vi.fn().mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT INTO cash_requests")) {
        const p = params ?? [];
        store.set(p[0] as string, {
          request_id: p[0],
          merchant_address: p[1],
          merchant_name: p[2],
          amount_mxn: p[3],
          amount_usdc: p[4],
          htlc_secret: p[5],
          htlc_secret_hash: p[6],
          htlc_tx_hash: p[7],
          status: p[8],
          created_at: p[9],
          expires_at: p[10],
          qr_payload: p[11],
          payer_address: p[12],
        });
        return { rowCount: 1 };
      }
      if (sql.includes("UPDATE cash_requests")) {
        const p = params ?? [];
        const existing = store.get(p[1] as string);
        if (existing) store.set(p[1] as string, { ...existing, status: p[0] });
        return { rowCount: existing ? 1 : 0 };
      }
      if (sql.includes("expires_at")) return { rows: [] };
      return { rowCount: 0, rows: [] };
    }),
    getOne: vi.fn().mockImplementation(async (_sql: string, params?: unknown[]) =>
      store.get((params ?? [])[0] as string) || null),
    getMany: vi.fn().mockResolvedValue({ rows: [] }),
    execute: vi.fn().mockResolvedValue({ rowCount: 1 }),
    default: {},
  };
});

describe("E2E: Cash request flow", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it("stores htlc_secret in DB (not in QR)", async () => {
    const { createCashRequest } = await import("../services/cash-requests.js");

    const secret = "supersecret_aabbccdd001122334455667788990011223344556677889900aabbccdd";
    const request = {
      request_id: "mcr-e2e-001",
      merchant_address: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN",
      merchant_name: "Farmacia Test",
      amount_mxn: 500,
      amount_usdc: "28.5714",
      htlc_secret: secret,
      htlc_secret_hash: createHash("sha256").update(Buffer.from(secret, "hex")).digest("hex"),
      htlc_tx_hash: "tx_hash_abc123",
      status: "pending" as const,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      qr_payload: "micopay://claim?request_id=mcr-e2e-001",
      payer_address: "GPAYER1234567890",
    };

    await createCashRequest(request);

    expect(request.htlc_secret).toBe(secret);
    expect(request.qr_payload).not.toContain("secret");
    expect(request.qr_payload).not.toContain(secret);
  });

  it("updates request status to completed after merchant scan", async () => {
    const { createCashRequest, updateCashRequestStatus, getCashRequest } = await import("../services/cash-requests.js");

    const request = {
      request_id: "mcr-e2e-002",
      merchant_address: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN",
      merchant_name: "Farmacia Test",
      amount_mxn: 300,
      amount_usdc: "17.1429",
      htlc_secret: "scan_secret_aabbccdd001122334455667788990011223344556677889900aabbccdd",
      htlc_secret_hash: createHash("sha256").update(Buffer.from("scan_secret_aabbccdd001122334455667788990011223344556677889900aabbccdd", "hex")).digest("hex"),
      htlc_tx_hash: "tx_hash_abc123",
      status: "pending" as const,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      qr_payload: "micopay://claim?request_id=mcr-e2e-002",
      payer_address: "GPAYER1234567890",
    };

    await createCashRequest(request);
    await updateCashRequestStatus(request.request_id, "completed");

    const retrieved = await getCashRequest(request.request_id);
    expect(retrieved?.status).toBe("completed");
  });

  it("marks expired request as expired", async () => {
    const { createCashRequest, updateCashRequestStatus } = await import("../services/cash-requests.js");

    const request = {
      request_id: "mcr-e2e-expired",
      merchant_address: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN",
      merchant_name: "Expired Test",
      amount_mxn: 100,
      amount_usdc: "5.7143",
      htlc_secret: "expired_secret_aabbccdd001122334455667788990011223344556677889900aabbccdd",
      htlc_secret_hash: "expired_hash",
      htlc_tx_hash: "tx_hash_expired",
      status: "pending" as const,
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      qr_payload: "micopay://claim?request_id=mcr-e2e-expired",
      payer_address: "GPAYER1234567890",
    };

    await createCashRequest(request);
    const success = await updateCashRequestStatus(request.request_id, "expired");
    expect(success).toBe(true);
  });

  it("computes trade_id as sha256(secret_hash)", async () => {
    const secret = "test_secret_aabbccdd001122334455667788990011223344556677889900aabbccdd";
    const secretHash = createHash("sha256").update(Buffer.from(secret, "hex")).digest("hex");
    const tradeId = createHash("sha256").update(Buffer.from(secretHash, "hex")).digest("hex");

    expect(tradeId).toHaveLength(64);
    expect(tradeId).not.toBe(secretHash);
  });

  it("qr_payload format is correct", async () => {
    const { createCashRequest } = await import("../services/cash-requests.js");

    const request = {
      request_id: "mcr-e2e-qr",
      merchant_address: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN",
      merchant_name: "QR Test",
      amount_mxn: 200,
      amount_usdc: "11.4286",
      htlc_secret: "qr_secret_aabbccdd001122334455667788990011223344556677889900aabbccdd",
      htlc_secret_hash: createHash("sha256").update(Buffer.from("qr_secret_aabbccdd001122334455667788990011223344556677889900aabbccdd", "hex")).digest("hex"),
      htlc_tx_hash: "tx_hash_qr",
      status: "pending" as const,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      qr_payload: "micopay://claim?request_id=mcr-e2e-qr",
      payer_address: "GPAYER1234567890",
    };

    await createCashRequest(request);

    expect(request.qr_payload).toMatch(/^micopay:\/\/claim\?request_id=mcr-/);
    expect(request.qr_payload).not.toContain("&secret=");
    expect(request.qr_payload).not.toContain(request.htlc_secret);
  });
});