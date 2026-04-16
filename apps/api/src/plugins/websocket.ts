/// <reference types="@fastify/websocket" />
import type { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import {
  subscribeToMerchant,
  subscribeToBazaar,
  subscribeToAll,
  removeSubscriberByWs,
  getSubscriberStats,
} from '../services/notifications.js';

export async function websocketPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(websocket);

  // @ts-expect-error - @fastify/websocket extends Fastify types
  fastify.get('/ws', { websocket: true }, (socket: WebSocket, _req) => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString()) as { action: string; payload?: Record<string, string> };

        switch (data.action) {
          case 'subscribe_merchant':
            if (data.payload?.address) {
              subscribeToMerchant(data.payload.address, socket);
              socket.send(JSON.stringify({
                type: 'subscribed',
                channel: 'merchant',
                address: data.payload.address,
              }));
            }
            break;

          case 'subscribe_bazaar':
            subscribeToBazaar(socket);
            socket.send(JSON.stringify({
              type: 'subscribed',
              channel: 'bazaar',
            }));
            break;

          case 'subscribe_all':
            subscribeToAll(socket);
            socket.send(JSON.stringify({
              type: 'subscribed',
              channel: 'all',
            }));
            break;

          case 'ping':
            socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;

          default:
            socket.send(JSON.stringify({
              type: 'error',
              message: `Unknown action: ${data.action}`,
            }));
        }
      } catch {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid JSON message',
        }));
      }
    });

    socket.on('close', () => {
      removeSubscriberByWs(socket);
    });

    socket.on('error', () => {
      fastify.log.error(`WebSocket error for ${clientId}`);
      removeSubscriberByWs(socket);
    });

    socket.send(JSON.stringify({
      type: 'connected',
      client_id: clientId,
      timestamp: new Date().toISOString(),
      channels: {
        merchant: 'Subscribe to cash requests for specific merchant',
        bazaar: 'Subscribe to bazaar intents and quotes',
        all: 'Subscribe to all notifications',
      },
    }));
  });

  fastify.get('/ws/stats', async (_request, reply) => {
    const stats = getSubscriberStats();
    return reply.send({
      websocket_clients: stats.total,
      subscriptions: stats.byFilter,
      timestamp: new Date().toISOString(),
    });
  });
}
