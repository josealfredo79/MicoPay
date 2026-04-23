import type { FastifyInstance } from 'fastify';

export async function accountRoutes(app: FastifyInstance) {
  app.get('/api/v1/account/balance', async () => {
    return { xlm: '0', usdc: '0', address: '' };
  });
}