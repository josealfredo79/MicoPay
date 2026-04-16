import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";

process.env.ESCROW_CONTRACT_ID = "C_TEST_CONTRACT_1234567890123456789012345678901234";
process.env.PLATFORM_SECRET_KEY = "S_TEST_SECRET_KEY_FOR_TESTING_ONLY_1234567890";

const MOCK_MERCHANT = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN";

vi.mock("../services/escrow.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/escrow.js")>();
  return {
    ...actual,
    lockEscrow: vi.fn(),
    EscrowLockError: class EscrowLockError extends Error {
      constructor(message: string, public readonly isRetryable = false) {
        super(message);
        this.name = "EscrowLockError";
      }
    },
  };
});

vi.mock("../services/cash-requests.js", async () => {
  const mockStore = new Map<string, any>();
  
  return {
    initCashRequestsTable: vi.fn().mockResolvedValue(undefined),
    createCashRequest: vi.fn(async (request) => {
      mockStore.set(request.request_id, request);
      return request;
    }),
    getCashRequest: vi.fn(async (requestId) => {
      return mockStore.get(requestId) || null;
    }),
    updateCashRequestStatus: vi.fn(async (requestId, status) => {
      const req = mockStore.get(requestId);
      if (req) {
        req.status = status;
        return true;
      }
      return false;
    }),
  };
});

const mockStore = new Map<string, any>();

vi.mocked(await import("../services/cash-requests.js")).createCashRequest.mockImplementation(
  async (request: any) => {
    mockStore.set(request.request_id, request);
    return request;
  }
);

vi.mocked(await import("../services/cash-requests.js")).getCashRequest.mockImplementation(
  async (requestId: string) => {
    return mockStore.get(requestId) || null;
  }
);

const { cashRoutes } = await import("../routes/cash.js");
const { clearRateLimitStore } = await import("../middleware/rate-limit.js");

describe("Cash Request Flow (with mocked escrow)", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    clearRateLimitStore();
    mockStore.clear();
    vi.clearAllMocks();
    app = Fastify();
    await app.register(cashRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /api/v1/cash/request", () => {
    const validPayload = {
      merchant_address: MOCK_MERCHANT,
      amount_mxn: 500,
    };

    it("should return 201 with valid request when escrow succeeds", async () => {
      const { lockEscrow } = await import("../services/escrow.js");
      vi.mocked(lockEscrow).mockResolvedValue("tx_hash_abc123");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/cash/request",
        payload: validPayload,
        headers: {
          "x-payment": `mock:${MOCK_MERCHANT}:0.01`,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("pending");
      expect(body.request_id).toMatch(/^mcr-/);
      expect(body.exchange.htlc_tx_hash).toBe("tx_hash_abc123");
      expect(body.qr_payload).toContain("micopay://claim");
    });

    it("should call lockEscrow with correct parameters", async () => {
      const { lockEscrow } = await import("../services/escrow.js");
      vi.mocked(lockEscrow).mockResolvedValue("tx_hash_abc123");

      await app.inject({
        method: "POST",
        url: "/api/v1/cash/request",
        payload: validPayload,
        headers: {
          "x-payment": `mock:${MOCK_MERCHANT}:0.01`,
        },
      });

      expect(lockEscrow).toHaveBeenCalledTimes(1);
      const [amount, secretHash, timeout] = vi.mocked(lockEscrow).mock.calls[0];
      expect(typeof amount).toBe("number");
      expect(secretHash).toMatch(/^[a-f0-9]{64}$/);
      expect(timeout).toBe(120);
    });

    it("should return 503 when escrow fails with retryable error", async () => {
      const { lockEscrow, EscrowLockError } = await import("../services/escrow.js");
      vi.mocked(lockEscrow).mockRejectedValue(
        new EscrowLockError("RPC timeout", true)
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/cash/request",
        payload: validPayload,
        headers: {
          "x-payment": `mock:${MOCK_MERCHANT}:0.01`,
        },
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Blockchain temporarily unavailable");
      expect(body.retry_after).toBe(30);
    });

    it("should return 500 when escrow fails with non-retryable error", async () => {
      const { lockEscrow, EscrowLockError } = await import("../services/escrow.js");
      vi.mocked(lockEscrow).mockRejectedValue(
        new EscrowLockError("Invalid contract state", false)
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/cash/request",
        payload: validPayload,
        headers: {
          "x-payment": `mock:${MOCK_MERCHANT}:0.01`,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Failed to initiate transaction");
    });

    it("should return 500 when escrow fails with generic error", async () => {
      const { lockEscrow } = await import("../services/escrow.js");
      vi.mocked(lockEscrow).mockRejectedValue(new Error("Network error"));

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/cash/request",
        payload: validPayload,
        headers: {
          "x-payment": `mock:${MOCK_MERCHANT}:0.01`,
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it("should return 404 when merchant not found", async () => {
      const nonExistentMerchant = "GAIKZIUYGD7J26CKDWZEFQBL43HLJKQUTQR3UYS7II7XNM7U6L3EQBZ7";
      
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/cash/request",
        payload: {
          merchant_address: nonExistentMerchant,
          amount_mxn: 500,
        },
        headers: {
          "x-payment": `mock:${MOCK_MERCHANT}:0.01`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for invalid payload", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/cash/request",
        payload: {
          amount_mxn: -100,
        },
        headers: {
          "x-payment": `mock:${MOCK_MERCHANT}:0.01`,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should include exchange rate info in response", async () => {
      const { lockEscrow } = await import("../services/escrow.js");
      vi.mocked(lockEscrow).mockResolvedValue("tx_hash_abc123");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/cash/request",
        payload: validPayload,
        headers: {
          "x-payment": `mock:${MOCK_MERCHANT}:0.01`,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.exchange).toBeDefined();
      expect(body.exchange.amount_mxn).toBe(500);
      expect(body.exchange.amount_usdc).toBeDefined();
      expect(body.exchange.rate_usdc_mxn).toBeDefined();
      expect(body.exchange.htlc_explorer_url).toContain("tx_hash_abc123");
    });

    it("should include claim_url in response", async () => {
      const { lockEscrow } = await import("../services/escrow.js");
      vi.mocked(lockEscrow).mockResolvedValue("tx_hash_abc123");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/cash/request",
        payload: validPayload,
        headers: {
          "x-payment": `mock:${MOCK_MERCHANT}:0.01`,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.claim_url).toMatch(/^http.*\/claim\/mcr-/);
    });
  });

  describe("GET /api/v1/cash/request/:id", () => {
    it("should return 404 for non-existent request", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/cash/request/non-existent-id",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("GET /api/v1/cash/rate", () => {
    it("should return current exchange rate", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/cash/rate",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pair).toBe("USDC/MXN");
      expect(body.rate).toBeGreaterThan(0);
      expect(body.timestamp).toBeDefined();
    });
  });
});
