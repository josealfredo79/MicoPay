import { describe, it, expect, beforeEach } from 'vitest';
import { getUsdcMxnRate, getCachedRateInfo, clearRateCache } from '../services/exchange-rate.js';

describe('Exchange Rate Oracle', () => {
  beforeEach(() => {
    clearRateCache();
  });

  it('should return a rate greater than 0', async () => {
    const rate = await getUsdcMxnRate();
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeGreaterThan(10); // MXN should be > 10 per USDC
    expect(rate).toBeLessThan(50); // MXN should be < 50 per USDC
  });

  it('should return rate with correct structure', async () => {
    const rate = await getUsdcMxnRate();
    const info = getCachedRateInfo();
    
    expect(info).not.toBeNull();
    expect(info?.rate).toBe(rate);
    expect(info?.source).toMatch(/^(coingecko|binance)$/);
    expect(info?.age_ms).toBeGreaterThanOrEqual(0);
  });

  it('should use cache on subsequent calls', async () => {
    const rate1 = await getUsdcMxnRate();
    const info1 = getCachedRateInfo();
    
    await new Promise(r => setTimeout(r, 10));
    
    const rate2 = await getUsdcMxnRate();
    const info2 = getCachedRateInfo();
    
    expect(rate1).toBe(rate2);
    expect(info2?.age_ms).toBeGreaterThanOrEqual(info1!.age_ms);
  });

  it('should clear cache when requested', () => {
    clearRateCache();
    const info = getCachedRateInfo();
    expect(info).toBeNull();
  });

  it('should return reasonable MXN rate', async () => {
    const rate = await getUsdcMxnRate();
    
    // In 2026, MXN should be around 17-25 per USD
    expect(rate).toBeGreaterThanOrEqual(15);
    expect(rate).toBeLessThanOrEqual(30);
  });
});
