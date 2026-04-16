const COINGECKO_API = "https://api.coingecko.com/api/v3";
const CACHE_TTL_MS = 60_000;

interface RateCache {
  rate: number;
  ts: number;
  source: string;
}

let rateCache: RateCache | null = null;

export async function getUsdcMxnRate(): Promise<number> {
  if (rateCache && Date.now() - rateCache.ts < CACHE_TTL_MS) {
    return rateCache.rate;
  }

  try {
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=usd-coin&vs_currencies=mxn`
    );
    
    if (response.ok) {
      const data = await response.json() as { "usd-coin": { mxn: number } };
      const rate = data["usd-coin"]?.mxn;
      
      if (rate && rate > 0) {
        rateCache = { rate, ts: Date.now(), source: "coingecko" };
        return rate;
      }
    }
  } catch (error) {
    console.warn("[Oracle] CoinGecko failed:", error);
  }

  try {
    const response = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=USDCUSDT"
    );
    if (response.ok) {
      const data = await response.json() as { price: string };
      const usdRate = parseFloat(data.price);
      if (usdRate && usdRate > 0) {
        const mxnResponse = await fetch(
          "https://api.binance.com/api/v3/ticker/price?symbol=USDTMXN"
        );
        if (mxnResponse.ok) {
          const mxnData = await mxnResponse.json() as { price: string };
          const mxnRate = parseFloat(mxnData.price);
          if (mxnRate) {
            const combinedRate = mxnRate / usdRate;
            rateCache = { rate: combinedRate, ts: Date.now(), source: "binance" };
            return combinedRate;
          }
        }
      }
    }
  } catch (error) {
    console.warn("[Oracle] Binance failed:", error);
  }

  if (rateCache) {
    console.warn("[Oracle] Using stale cache");
    return rateCache.rate;
  }
  
  console.warn("[Oracle] All sources failed, using fallback rate");
  return 17.5;
}

export function getCachedRateInfo(): { rate: number; source: string; age_ms: number } | null {
  if (!rateCache) return null;
  return {
    rate: rateCache.rate,
    source: rateCache.source,
    age_ms: Date.now() - rateCache.ts
  };
}

export function clearRateCache(): void {
  rateCache = null;
}
