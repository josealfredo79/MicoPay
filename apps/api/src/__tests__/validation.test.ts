import { describe, it, expect } from 'vitest';
import {
  stellarAddressSchema,
  cashRequestSchema,
  cashAgentsQuerySchema,
  bazaarIntentSchema,
  validateOrThrow,
  ValidationError
} from '../schemas/validation.js';

describe('Validation Schemas', () => {
  const VALID_STELLAR = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

  describe('stellarAddressSchema', () => {
    it('should accept valid Stellar address', () => {
      const result = stellarAddressSchema.safeParse(VALID_STELLAR);
      expect(result.success).toBe(true);
    });

    it('should reject invalid Stellar address', () => {
      const result = stellarAddressSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });

    it('should reject address with wrong prefix', () => {
      const result = stellarAddressSchema.safeParse('1BBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
      expect(result.success).toBe(false);
    });
  });

  describe('cashRequestSchema', () => {
    it('should accept valid cash request', () => {
      const result = cashRequestSchema.safeParse({
        merchant_address: VALID_STELLAR,
        amount_mxn: 500,
      });
      expect(result.success).toBe(true);
    });

    it('should reject amount below minimum', () => {
      const result = cashRequestSchema.safeParse({
        merchant_address: VALID_STELLAR,
        amount_mxn: 10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject amount above maximum', () => {
      const result = cashRequestSchema.safeParse({
        merchant_address: VALID_STELLAR,
        amount_mxn: 100000,
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional location fields', () => {
      const result = cashRequestSchema.safeParse({
        merchant_address: VALID_STELLAR,
        amount_mxn: 500,
        user_lat: 19.4195,
        user_lng: -99.1627,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('cashAgentsQuerySchema', () => {
    it('should apply defaults', () => {
      const result = cashAgentsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lat).toBe(19.4195);
        expect(result.data.lng).toBe(-99.1627);
        expect(result.data.amount).toBe(500);
        expect(result.data.limit).toBe(5);
      }
    });

    it('should coerce string numbers', () => {
      const result = cashAgentsQuerySchema.safeParse({
        lat: '19.5',
        amount: '1000',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lat).toBe(19.5);
        expect(result.data.amount).toBe(1000);
      }
    });

    it('should reject invalid latitude', () => {
      const result = cashAgentsQuerySchema.safeParse({ lat: 100 });
      expect(result.success).toBe(false);
    });
  });

  describe('bazaarIntentSchema', () => {
    it('should accept valid intent', () => {
      const result = bazaarIntentSchema.safeParse({
        offered_chain: 'ethereum',
        offered_symbol: 'ETH',
        offered_amount: '2.5',
        wanted_chain: 'stellar',
        wanted_symbol: 'USDC',
        wanted_amount: '7000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid chain', () => {
      const result = bazaarIntentSchema.safeParse({
        offered_chain: 'invalid',
        offered_symbol: 'ETH',
        offered_amount: '2.5',
        wanted_chain: 'stellar',
        wanted_symbol: 'USDC',
        wanted_amount: '7000',
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional min_rate', () => {
      const result = bazaarIntentSchema.safeParse({
        offered_chain: 'ethereum',
        offered_symbol: 'ETH',
        offered_amount: '2.5',
        wanted_chain: 'stellar',
        wanted_symbol: 'USDC',
        wanted_amount: '7000',
        min_rate: 0.95,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('validateOrThrow', () => {
    it('should return data on success', () => {
      const data = validateOrThrow(stellarAddressSchema, VALID_STELLAR);
      expect(data).toBe(VALID_STELLAR);
    });

    it('should throw ValidationError on failure', () => {
      expect(() => validateOrThrow(stellarAddressSchema, 'invalid')).toThrow(ValidationError);
    });
  });
});
