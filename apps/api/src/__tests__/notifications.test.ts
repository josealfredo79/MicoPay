import { describe, it, expect, beforeEach } from 'vitest';
import {
  addSubscriber,
  removeSubscriber,
  notify,
  getSubscriberCount,
  getSubscriberStats,
  clearAllSubscribers,
} from '../services/notifications.js';

class MockWebSocket {
  messages: string[] = [];
  readyState = 1;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  send(data: string): void {
    this.messages.push(data);
  }

  close(): void {
    this.readyState = 3;
  }
}

describe('Notifications Service', () => {
  beforeEach(() => {
    clearAllSubscribers();
  });

  it('should add and remove subscribers', () => {
    const ws = new MockWebSocket();
    const id = 'test-subscriber-1';
    
    addSubscriber(id, ws as any, []);
    expect(getSubscriberCount()).toBe(1);
    
    removeSubscriber(id);
    expect(getSubscriberCount()).toBe(0);
  });

  it('should notify subscribers with matching filters', () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    
    addSubscriber('ws1', ws1 as any, ['cash_request']);
    addSubscriber('ws2', ws2 as any, ['bazaar_intent']);
    
    const sent = notify('cash_request', { test: 'data' });
    
    expect(sent).toBe(1);
    expect(ws1.messages.length).toBe(1);
    expect(ws2.messages.length).toBe(0);
    
    const notification = JSON.parse(ws1.messages[0]);
    expect(notification.type).toBe('cash_request');
    expect(notification.payload).toEqual({ test: 'data' });
    expect(notification.timestamp).toBeDefined();
  });

  it('should notify subscribers with empty filters (all types)', () => {
    const ws = new MockWebSocket();
    
    addSubscriber('ws-all', ws as any, []);
    
    notify('cash_request', { type: 'cash' });
    notify('bazaar_intent', { type: 'bazaar' });
    
    expect(ws.messages.length).toBe(2);
  });

  it('should remove closed websocket subscribers on next notification', () => {
    const ws = new MockWebSocket();
    addSubscriber('ws-closing', ws as any, []);
    
    ws.close();
    // Closed sockets are removed on next notify call
    notify('cash_request', {});
    expect(getSubscriberCount()).toBe(0);
  });

  it('should provide subscriber stats', () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    
    addSubscriber('ws1', ws1 as any, ['cash_request']);
    addSubscriber('ws2', ws2 as any, ['cash_request', 'bazaar_intent']);
    
    const stats = getSubscriberStats();
    
    expect(stats.total).toBe(2);
    expect(stats.byFilter.cash_request).toBe(2);
    expect(stats.byFilter.bazaar_intent).toBe(1);
  });

  it('should include timestamp in notifications', () => {
    const ws = new MockWebSocket();
    addSubscriber('ws-timestamp', ws as any, []);
    
    notify('cash_request', {});
    
    const notification = JSON.parse(ws.messages[0]);
    expect(notification.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should handle multiple notifications', () => {
    const ws = new MockWebSocket();
    addSubscriber('ws-multi', ws as any, []);
    
    for (let i = 0; i < 5; i++) {
      notify('cash_request', { index: i });
    }
    
    expect(ws.messages.length).toBe(5);
  });
});
