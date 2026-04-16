import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, rateLimitByService, clearRateLimitStore, getRateLimitStoreSize } from '../middleware/rate-limit.js';

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it('should allow requests within limit', async () => {
    const handler = rateLimit({ windowMs: 60_000, maxRequests: 3 });
    
    const mockRequest = { ip: '192.168.1.1', url: '/test' };
    const mockReply = {
      header: () => mockReply,
      status: () => mockReply,
      send: () => {},
    } as any;
    
    for (let i = 0; i < 3; i++) {
      await handler(mockRequest, mockReply);
    }
    
    expect(getRateLimitStoreSize()).toBe(1);
  });

  it('should block requests over limit', async () => {
    const handler = rateLimit({ windowMs: 60_000, maxRequests: 2 });
    
    const mockRequest = { ip: '192.168.1.2', url: '/test' };
    const mockReply = {
      header: () => mockReply,
      send: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any;
    
    await handler(mockRequest, mockReply);
    await handler(mockRequest, mockReply);
    await handler(mockRequest, mockReply);
    
    expect(mockReply.status).toHaveBeenCalledWith(429);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Too Many Requests' })
    );
  });

  it('should use different limits per IP', async () => {
    const handler = rateLimit({ windowMs: 60_000, maxRequests: 2 });
    
    const mockReply = {
      header: () => mockReply,
      send: () => {},
      status: () => mockReply,
    } as any;
    
    const req1 = { ip: '10.0.0.1', url: '/test' };
    const req2 = { ip: '10.0.0.2', url: '/test' };
    
    await handler(req1, mockReply);
    await handler(req1, mockReply);
    await handler(req1, mockReply); // blocked
    
    await handler(req2, mockReply); // not blocked (different IP)
    await handler(req2, mockReply); // not blocked
    
    expect(getRateLimitStoreSize()).toBe(2);
  });

  it('should have correct service limits defined', () => {
    expect(rateLimitByService.cash_request.maxRequests).toBe(5);
    expect(rateLimitByService.cash_request.windowMs).toBe(300_000);
    expect(rateLimitByService.cash_agents.maxRequests).toBe(30);
    expect(rateLimitByService.bazaar_feed.maxRequests).toBe(60);
  });

  it('should include rate limit headers', async () => {
    const handler = rateLimit({ windowMs: 60_000, maxRequests: 10 });
    
    const mockRequest = { ip: '192.168.1.3', url: '/test' };
    const mockReply = {
      header: vi.fn().mockReturnThis(),
      send: () => {},
      status: () => mockReply,
    } as any;
    
    await handler(mockRequest, mockReply);
    
    expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
    expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
    expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
  });

  it('should clear store correctly', async () => {
    const handler = rateLimit({ windowMs: 60_000, maxRequests: 5 });
    
    const mockRequest = { ip: '192.168.1.4', url: '/test' };
    const mockReply = {
      header: () => mockReply,
      send: () => {},
      status: () => mockReply,
    } as any;
    
    await handler(mockRequest, mockReply);
    expect(getRateLimitStoreSize()).toBe(1);
    
    clearRateLimitStore();
    expect(getRateLimitStoreSize()).toBe(0);
  });
});
