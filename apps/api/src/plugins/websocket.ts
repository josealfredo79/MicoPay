/// <reference types="@fastify/websocket" />
import type { FastifyInstance, FastifyRequest } from 'fastify';
import websocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  subscribeToMerchant,
  subscribeToBazaar,
  subscribeToAll,
  removeSubscriberByWs,
  getSubscriberStats,
} from '../services/notifications.js';

const WS_AUTH_TOKEN = process.env.WS_AUTH_TOKEN;
const NETWORK = process.env.STELLAR_NETWORK === 'MAINNET'
  ? StellarSdk.Networks.PUBLIC
  : StellarSdk.Networks.TESTNET;

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function verifyStellarSignature(
  address: string,
  signature: string,
  message: string,
): boolean {
  try {
    const keypair = StellarSdk.Keypair.fromPublicKey(address);
    const msgBytes = Buffer.from(new TextEncoder().encode(message));
    const sigBytes = base64ToUint8Array(signature);
    return keypair.verify(msgBytes, sigBytes as unknown as Buffer);
  } catch {
    return false;
  }
}

function authenticateRequest(
  headers: Record<string, string | string[] | undefined>,
): { valid: boolean; address?: string } {
  const authHeader = headers.authorization as string | undefined;

  if (WS_AUTH_TOKEN) {
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (token === WS_AUTH_TOKEN) {
      return { valid: true };
    }
  }

  const sigHeader = headers['x-stellar-signature'] as string | undefined;
  const addrHeader = headers['x-stellar-address'] as string | undefined;
  const msgHeader = headers['x-stellar-message'] as string | undefined;

  if (sigHeader && addrHeader && msgHeader) {
    if (verifyStellarSignature(addrHeader, sigHeader, msgHeader)) {
      return { valid: true, address: addrHeader };
    }
  }

  if (!WS_AUTH_TOKEN && !sigHeader) {
    return { valid: true };
  }

  return { valid: false };
}

export async function websocketPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(websocket);

  // @ts-ignore - @fastify/websocket extends Fastify types
  fastify.get('/ws', { websocket: true }, (socket: WebSocket, request: FastifyRequest) => {
    const auth = authenticateRequest(request.headers);
    if (!auth.valid) {
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Unauthorized',
      }));
      socket.close(4001, 'Unauthorized');
      return;
    }
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
      authenticated: !!auth.address,
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
