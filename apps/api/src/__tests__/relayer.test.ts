import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  watchSwap,
  unwatchSwap,
  getSwapStatus,
  claimSwap,
  refundSwap,
  configureRelayer,
  startRelayer,
  stopRelayer,
  resetRelayer,
  getRelayerStats,
  getWatchedSwaps,
} from '../services/relayer.js';

describe('Relayer Service', () => {
  beforeEach(() => {
    resetRelayer();
  });

  afterEach(() => {
    resetRelayer();
  });

  it('should watch a swap', async () => {
    const swap = await watchSwap({
      swapId: 'swap-001',
      secretHash: 'a'.repeat(64),
      amount: '1000000',
      timeoutMinutes: 60,
      chain: 'stellar',
    });

    expect(swap.swapId).toBe('swap-001');
    expect(swap.status).toBe('watching');
    expect(swap.chain).toBe('stellar');
  });

  it('should unwatch a swap', async () => {
    await watchSwap({
      swapId: 'swap-002',
      secretHash: 'b'.repeat(64),
      amount: '500000',
      timeoutMinutes: 30,
    });

    const removed = await unwatchSwap('swap-002');
    expect(removed).toBe(true);

    const status = await getSwapStatus('swap-002');
    expect(status).toBeNull();
  });

  it('should get swap status', async () => {
    await watchSwap({
      swapId: 'swap-003',
      secretHash: 'c'.repeat(64),
      amount: '200000',
      timeoutMinutes: 120,
    });

    const status = await getSwapStatus('swap-003');
    expect(status).not.toBeNull();
    expect(status?.swapId).toBe('swap-003');
    expect(status?.status).toBe('watching');
  });

  it('should mark expired swap as expired', async () => {
    const swap = await watchSwap({
      swapId: 'swap-expired',
      secretHash: 'd'.repeat(64),
      amount: '100000',
      timeoutMinutes: 0,
    });

    await new Promise(r => setTimeout(r, 10));

    const status = await getSwapStatus('swap-expired');
    expect(status?.status).toBe('expired');
  });

  it('should reject claim with invalid secret', async () => {
    await watchSwap({
      swapId: 'swap-claim-invalid',
      secretHash: 'e'.repeat(64),
      amount: '100000',
      timeoutMinutes: 60,
    });

    const result = await claimSwap('swap-claim-invalid', 'wrongsecret');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid secret');
  });

  it('should reject claim for non-existent swap', async () => {
    const result = await claimSwap('non-existent', 'a'.repeat(64));
    expect(result.success).toBe(false);
    expect(result.message).toBe('Swap not found');
  });

  it('should reject refund before expiry', async () => {
    await watchSwap({
      swapId: 'swap-no-refund',
      secretHash: 'f'.repeat(64),
      amount: '100000',
      timeoutMinutes: 60,
    });

    const result = await refundSwap('swap-no-refund');
    expect(result.success).toBe(false);
    expect(result.message).toContain('not expired');
  });

  it('should provide relayer stats', async () => {
    await watchSwap({
      swapId: 'stats-1',
      secretHash: 'g'.repeat(64),
      amount: '100',
      timeoutMinutes: 60,
    });

    await watchSwap({
      swapId: 'stats-2',
      secretHash: 'h'.repeat(64),
      amount: '200',
      timeoutMinutes: 0,
    });

    await new Promise(r => setTimeout(r, 10));
    await getSwapStatus('stats-2');

    const stats = getRelayerStats();
    expect(stats.total).toBe(2);
    expect(stats.watching).toBe(1);
    expect(stats.expired).toBe(1);
  });

  it('should start and stop relayer', () => {
    startRelayer();
    expect(getRelayerStats().watching).toBeDefined();

    stopRelayer();
  });

  it('should get all watched swaps', async () => {
    await watchSwap({
      swapId: 'list-1',
      secretHash: 'i'.repeat(64),
      amount: '100',
      timeoutMinutes: 60,
    });

    await watchSwap({
      swapId: 'list-2',
      secretHash: 'j'.repeat(64),
      amount: '200',
      timeoutMinutes: 60,
    });

    const swaps = getWatchedSwaps();
    expect(swaps.length).toBe(2);
    expect(swaps.map(s => s.swapId)).toContain('list-1');
    expect(swaps.map(s => s.swapId)).toContain('list-2');
  });

  it('should configure relayer', () => {
    configureRelayer({ pollIntervalMs: 5000, maxWatchedSwaps: 500 });
  });
});
