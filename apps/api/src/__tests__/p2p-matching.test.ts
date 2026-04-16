import { describe, it, expect } from 'vitest';
import { distanceKm, getTopProviders, normalizeProviders, MERCHANTS_DATA, getScoredMerchantsFromDB } from '../services/p2p.js';

describe('P2P Matching Engine', () => {
  describe('distanceKm', () => {
    it('should calculate distance between Roma Norte and Condesa', () => {
      const roma = { lat: 19.4195, lng: -99.1627 };
      const condesa = { lat: 19.4110, lng: -99.1740 };
      const distance = distanceKm(roma.lat, roma.lng, condesa.lat, condesa.lng);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2);
    });

    it('should return 0 for same location', () => {
      const distance = distanceKm(19.4195, -99.1627, 19.4195, -99.1627);
      expect(distance).toBe(0);
    });
  });

  describe('normalizeProviders', () => {
    it('should convert MerchantData to Provider with reputation', () => {
      const providers = normalizeProviders(MERCHANTS_DATA);
      expect(providers.length).toBe(MERCHANTS_DATA.length);
      providers.forEach(p => {
        expect(p.reputation).toBeGreaterThan(0);
        expect(p.reputation).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('getTopProviders', () => {
    it('should return providers near Roma Norte sorted by score', () => {
      const providers = getTopProviders({ lat: 19.4195, lng: -99.1627, amount: 500 }, 5);
      
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.length).toBeLessThanOrEqual(5);
      
      providers.forEach(p => {
        expect(p.online).toBe(true);
        expect(p.available_mxn).toBeGreaterThanOrEqual(500);
        expect(p.max_trade_mxn).toBeGreaterThanOrEqual(500);
        expect(p.min_trade_mxn).toBeLessThanOrEqual(500);
      });
      
      for (let i = 1; i < providers.length; i++) {
        expect(providers[i - 1].score).toBeGreaterThanOrEqual(providers[i].score);
      }
    });

    it('should exclude offline merchants', () => {
      const providers = getTopProviders({ lat: 19.4195, lng: -99.1627, amount: 500 }, 10);
      providers.forEach(p => {
        expect(p.online).toBe(true);
      });
    });

    it('should handle empty results gracefully', () => {
      const providers = getTopProviders({ lat: 0, lng: 0, amount: 1000000 }, 5);
      expect(providers).toEqual([]);
    });
  });

  describe('getScoredMerchantsFromDB (fallback)', () => {
    it('should return mock data when DB is unavailable', async () => {
      const merchants = await getScoredMerchantsFromDB(19.4195, -99.1627, 500, 5);
      
      expect(merchants.length).toBeGreaterThan(0);
      merchants.forEach(m => {
        expect(m.stellar_address).toBeDefined();
        expect(m.stellar_address.length).toBeGreaterThanOrEqual(50);
        expect(m.score).toBeGreaterThan(0);
        expect(m.distance_km).toBeGreaterThanOrEqual(0);
      });
    });

    it('should filter by amount correctly', async () => {
      const smallAmount = await getScoredMerchantsFromDB(19.4195, -99.1627, 50, 5);
      const largeAmount = await getScoredMerchantsFromDB(19.4195, -99.1627, 5000, 5);
      
      expect(smallAmount.length).toBeGreaterThanOrEqual(largeAmount.length);
    });
  });
});
