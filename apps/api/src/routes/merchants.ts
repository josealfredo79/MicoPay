import type { FastifyInstance } from "fastify";
import { registerMerchant, getMerchantByStellarAddress, listMerchants } from "../services/p2p-registry.js";
import { validateOrThrow, merchantRegistrationSchema, stellarAddressSchema, ValidationError } from "../schemas/validation.js";

export async function merchantRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/api/v1/merchants",
    async (request, reply) => {
      let validated;
      try {
        validated = validateOrThrow(merchantRegistrationSchema, request.body ?? {});
      } catch (err) {
        if (err instanceof ValidationError) {
          return reply.status(400).send({ error: "Validation failed", details: err.message });
        }
        throw err;
      }

      try {
        const merchant = await registerMerchant(validated);
        return reply.status(201).send({
          success: true,
          id: merchant.id,
          stellar_address: merchant.stellar_address,
          name: merchant.name,
          type: merchant.type,
          status: merchant.status,
          message: "Merchant registered successfully. Awaiting verification.",
        });
      } catch (err) {
        if (err instanceof Error) {
          return reply.status(400).send({ error: err.message });
        }
        throw err;
      }
    }
  );

  fastify.get(
    "/api/v1/merchants",
    async (request, reply) => {
      const query = request.query as Record<string, string>;
      const online = query.online === "true";
      const type = query.type;
      const limit = Math.min(parseInt(query.limit ?? "20", 10), 100);

      const merchants = await listMerchants({
        online: online ? true : undefined,
        type: type || undefined,
      });

      return reply.send({
        merchants: merchants.slice(0, limit).map(m => ({
          id: m.id,
          stellar_address: m.stellar_address,
          name: m.name,
          type: m.type,
          address: m.address,
          tier: m.tier,
          status: m.status,
          online: m.online,
          completion_rate: m.completion_rate,
          trades_completed: m.trades_completed,
          volume_usdc: m.volume_usdc,
        })),
        count: Math.min(merchants.length, limit),
        total: merchants.length,
      });
    }
  );

  fastify.get(
    "/api/v1/merchants/:address",
    async (request, reply) => {
      const { address } = request.params as { address: string };

      try {
        validateOrThrow(stellarAddressSchema, address);
      } catch {
        return reply.status(400).send({ error: "Invalid Stellar address" });
      }

      const merchant = await getMerchantByStellarAddress(address);
      if (!merchant) {
        return reply.status(404).send({ error: "Merchant not found" });
      }

      return reply.send({
        id: merchant.id,
        stellar_address: merchant.stellar_address,
        name: merchant.name,
        type: merchant.type,
        address: merchant.address,
        tier: merchant.tier,
        status: merchant.status,
        verified: merchant.verified,
        online: merchant.online,
        completion_rate: merchant.completion_rate,
        trades_completed: merchant.trades_completed,
        volume_usdc: merchant.volume_usdc,
        avg_time_minutes: merchant.avg_time_minutes,
      });
    }
  );
}
