interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 10,
};

const rateLimitStore = new Map<string, RateLimitEntry>();
export { rateLimitStore };

export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const { windowMs, maxRequests } = { ...DEFAULT_CONFIG, ...config };

  return async function rateLimitHandler(
    request: any,
    reply: any
  ): Promise<void> {
    const ip = request.ip ?? request.headers['x-forwarded-for'] ?? 'unknown';
    const path = request.url ?? '/';
    const key = `${ip}:${path}`;
    
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    
    if (entry && entry.resetAt > now) {
      entry.count++;
    } else {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    }
    
    const currentEntry = rateLimitStore.get(key)!;
    
    reply.header('X-RateLimit-Limit', maxRequests);
    reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - currentEntry.count));
    reply.header('X-RateLimit-Reset', Math.ceil(currentEntry.resetAt / 1000));
    
    if (currentEntry.count > maxRequests) {
      reply.status(429).send({
        error: 'Too Many Requests',
        retry_after_seconds: Math.ceil((currentEntry.resetAt - now) / 1000),
      });
      return;
    }
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000);

export const rateLimitByService: Record<string, RateLimitConfig> = {
  cash_request: { windowMs: 300_000, maxRequests: 5 },
  cash_agents: { windowMs: 60_000, maxRequests: 30 },
  bazaar_feed: { windowMs: 60_000, maxRequests: 60 },
};

export function createServiceRateLimit(service: string) {
  const config = rateLimitByService[service] ?? {};
  return rateLimit(config);
}

export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}

export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}
