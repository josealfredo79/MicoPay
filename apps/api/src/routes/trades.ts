import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as tradeService from '../services/trade.service.js';

export async function tradeRoutes(app: FastifyInstance) {
  // All trade routes require authentication
  app.addHook('preHandler', authMiddleware);

  /**
   * POST /api/v1/trades
   * Buyer creates a new trade. Generates HTLC secret and returns secret_hash.
   */
  app.post('/api/v1/trades', {
    schema: {
      body: {
        type: 'object',
        required: ['seller_id', 'amount_mxn'],
        properties: {
          seller_id: { type: 'string', format: 'uuid' },
          amount_mxn: { type: 'integer', minimum: 100, maximum: 50000 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { seller_id, amount_mxn } = request.body as { seller_id: string; amount_mxn: number };
    const buyerId = request.user.id;

    const trade = await tradeService.createTrade({
      sellerId: seller_id,
      buyerId,
      amountMxn: amount_mxn,
    });

    // Don't expose encrypted secret fields in response
    const { secret_enc, secret_nonce, ...safeTrade } = trade;

    reply.status(201);
    return { trade: safeTrade };
  });

  /**
   * GET /api/v1/trades/active
   * List active trades for the authenticated user.
   */
  app.get('/api/v1/trades/active', async (request) => {
    const trades = await tradeService.getActiveTrades(request.user.id);
    const safeTrades = trades.map(({ secret_enc, secret_nonce, ...t }: any) => t);
    return { trades: safeTrades };
  });

  /**
   * GET /api/v1/trades/history
   * All trades (active + completed) for the authenticated user, newest first.
   */
  app.get('/api/v1/trades/history', async (request) => {
    const trades = await tradeService.getTradeHistory(request.user.id);
    return { trades };
  });

  /**
   * GET /api/v1/trades/:id
   * Get trade detail (only for participants).
   */
  app.get('/api/v1/trades/:id', async (request) => {
    const { id } = request.params as { id: string };
    const trade = await tradeService.getTradeById(id, request.user.id);

    const { secret_enc, secret_nonce, ...safeTrade } = trade;
    return { trade: safeTrade };
  });

  /**
   * POST /api/v1/trades/:id/lock
   * Backend calls Soroban contract lock() and returns the tx hash.
   */
  app.post('/api/v1/trades/:id/lock', async (request) => {
    const { id } = request.params as { id: string };
    return tradeService.lockTrade(id, request.user.id);
  });

  /**
   * POST /api/v1/trades/:id/reveal
   * Seller confirms cash was received. Enables secret access.
   */
  app.post('/api/v1/trades/:id/reveal', async (request) => {
    const { id } = request.params as { id: string };
    return tradeService.revealTrade(id, request.user.id);
  });

  /**
   * GET /api/v1/trades/:id/secret
   * Seller gets the HTLC secret to show QR to buyer.
   * Only available in 'revealing' state.
   */
  app.get('/api/v1/trades/:id/secret', async (request) => {
    const { id } = request.params as { id: string };
    return tradeService.getTradeSecret(
      id,
      request.user.id,
      request.ip,
      request.headers['user-agent'] || 'unknown',
    );
  });

  /**
   * POST /api/v1/trades/:id/complete
   * Buyer confirms cash received. Backend calls release() on Soroban and returns the tx hash.
   */
  app.post('/api/v1/trades/:id/complete', async (request) => {
    const { id } = request.params as { id: string };
    return tradeService.completeTrade(id, request.user.id);
  });

  /**
   * POST /api/v1/trades/:id/cancel
   * Either party cancels (only before lock).
   */
  app.post('/api/v1/trades/:id/cancel', async (request) => {
    const { id } = request.params as { id: string };
    return tradeService.cancelTrade(id, request.user.id);
  });
}
