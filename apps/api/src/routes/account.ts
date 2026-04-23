import type { FastifyInstance } from 'fastify';

export async function accountRoutes(app: FastifyInstance) {
  console.log("[Routes] Registering accountRoutes...");
  
  app.get('/api/v1/account/balance', async (request, reply) => {
    console.log("[Routes] GET /api/v1/account/balance called");
    return { xlm: '0', usdc: '0', address: '' };
  });
  
  app.get('/account/balance', async (request, reply) => {
    console.log("[Routes] GET /account/balance called");
    return { xlm: '0', usdc: '0', address: '' };
  });
  
  console.log("[Routes] accountRoutes registered");
}