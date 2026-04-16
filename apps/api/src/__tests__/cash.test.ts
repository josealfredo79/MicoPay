import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";

process.env.ESCROW_CONTRACT_ID = "C_TEST_CONTRACT_1234567890123456789012345678901234";
process.env.PLATFORM_SECRET_KEY = "S_TEST_SECRET_KEY_FOR_TESTING_ONLY_1234567890";

const { cashRoutes } = await import("../routes/cash.js");

describe("Cash Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(cashRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/v1/cash/agents", () => {
    it("should return 402 without payment", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/cash/agents",
      });

      expect(response.statusCode).toBe(402);
      const body = JSON.parse(response.body);
      expect(body.challenge.service).toBe("cash_agents");
    });
  });

  describe("POST /api/v1/cash/request", () => {
    it("should return 402 without payment", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/cash/request",
        payload: {
          amount_mxn: 500,
          agent_id: "merchant-001",
        },
      });

      expect(response.statusCode).toBe(402);
    });
  });
});
