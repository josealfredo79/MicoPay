import type { WebSocket } from 'ws';

export type NotificationType = 'cash_request' | 'bazaar_intent' | 'bazaar_quote' | 'trade_update' | 'merchant_online' | 'merchant_offline';

export interface Notification {
  type: NotificationType;
  payload: unknown;
  timestamp: string;
}

interface Subscriber {
  id: string;
  ws: WebSocket;
  filters: NotificationType[];
  metadata?: Record<string, string>;
}

const subscribers = new Map<string, Subscriber>();

export function addSubscriber(
  id: string,
  ws: WebSocket,
  filters: NotificationType[] = []
): void {
  subscribers.set(id, { id, ws, filters });
}

export function removeSubscriber(id: string): void {
  subscribers.delete(id);
}

export function removeSubscriberByWs(ws: WebSocket): void {
  for (const [id, sub] of subscribers.entries()) {
    if (sub.ws === ws) {
      subscribers.delete(id);
      return;
    }
  }
}

export function notify(type: NotificationType, payload: unknown): number {
  const notification: Notification = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };

  const message = JSON.stringify(notification);
  let sent = 0;

  for (const [id, subscriber] of subscribers.entries()) {
    if (subscriber.filters.length === 0 || subscriber.filters.includes(type)) {
      if (subscriber.ws.readyState === 1) {
        try {
          subscriber.ws.send(message);
          sent++;
        } catch {
          subscribers.delete(id);
        }
      } else {
        subscribers.delete(id);
      }
    }
  }

  return sent;
}

export function subscribeToMerchant(
  merchantAddress: string,
  ws: WebSocket
): string {
  const id = `merchant-${merchantAddress.slice(0, 8)}-${Date.now()}`;
  addSubscriber(id, ws, ['cash_request']);
  return id;
}

export function subscribeToBazaar(ws: WebSocket): string {
  const id = `bazaar-${Date.now()}`;
  addSubscriber(id, ws, ['bazaar_intent', 'bazaar_quote', 'trade_update']);
  return id;
}

export function subscribeToAll(ws: WebSocket): string {
  const id = `all-${Date.now()}`;
  addSubscriber(id, ws, []);
  return id;
}

export function notifyCashRequest(request: {
  request_id: string;
  merchant_address: string;
  amount_mxn: number;
  amount_usdc: string;
  payer_address: string;
}): number {
  return notify('cash_request', request);
}

export function notifyBazaarIntent(intent: {
  id: string;
  agent_address: string;
  offered_symbol: string;
  wanted_symbol: string;
}): number {
  return notify('bazaar_intent', intent);
}

export function notifyBazaarQuote(quote: {
  id: string;
  intent_id: string;
  rate: number;
}): number {
  return notify('bazaar_quote', quote);
}

export function notifyTradeUpdate(update: {
  swap_id: string;
  status: string;
}): number {
  return notify('trade_update', update);
}

export function getSubscriberCount(): number {
  return subscribers.size;
}

export function getSubscriberStats(): {
  total: number;
  byFilter: Record<string, number>;
} {
  const byFilter: Record<string, number> = {};

  for (const sub of subscribers.values()) {
    for (const filter of sub.filters) {
      byFilter[filter] = (byFilter[filter] || 0) + 1;
    }
    if (sub.filters.length === 0) {
      byFilter['all'] = (byFilter['all'] || 0) + 1;
    }
  }

  return { total: subscribers.size, byFilter };
}

export function clearAllSubscribers(): void {
  subscribers.clear();
}
