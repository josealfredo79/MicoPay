export type ProviderTier = "espora" | "maestro" | "experto" | "activo";

export interface MerchantData {
  id: string;
  stellar_address: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  available_mxn: number;
  max_trade_mxn: number;
  min_trade_mxn: number;
  tier: ProviderTier;
  completion_rate: number;
  trades_completed: number;
  avg_time_minutes: number;
  online: boolean;
}

const MERCHANTS_DATA: MerchantData[] = [
  // Roma Norte
  {
    id: "GM001",
    stellar_address: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN",
    name: "Farmacia Guadalupe",
    type: "farmacia",
    address: "Orizaba 45, Col. Roma Norte, CDMX",
    lat: 19.4195,
    lng: -99.1627,
    available_mxn: 5000,
    max_trade_mxn: 3000,
    min_trade_mxn: 100,
    tier: "maestro",
    completion_rate: 0.98,
    trades_completed: 312,
    avg_time_minutes: 4,
    online: true,
  },
  {
    id: "GM002",
    stellar_address: "GDAHK7EEG2WWHVKDNT4CEQFZGKF2LGDSW2IVM4S5DP42RBW3K6BTODB4A",
    name: "Tienda Don Pepe",
    type: "tienda",
    address: "Av. Álvaro Obregón 120, Col. Roma Norte, CDMX",
    lat: 19.4165,
    lng: -99.1580,
    available_mxn: 3000,
    max_trade_mxn: 2000,
    min_trade_mxn: 200,
    tier: "experto",
    completion_rate: 0.93,
    trades_completed: 156,
    avg_time_minutes: 7,
    online: true,
  },
  // Condesa
  {
    id: "GM003",
    stellar_address: "GCF3CJXADZKIODEGZHTBQKPAGMO5KYVW6SLJ3J5GBQZDIFHGT7ZZQMFB",
    name: "Papelería La Central",
    type: "papeleria",
    address: "Col. Condesa, CDMX",
    lat: 19.4110,
    lng: -99.1740,
    available_mxn: 2000,
    max_trade_mxn: 1500,
    min_trade_mxn: 100,
    tier: "activo",
    completion_rate: 0.88,
    trades_completed: 45,
    avg_time_minutes: 5,
    online: true,
  },
  // Del Valle
  {
    id: "GM004",
    stellar_address: "GDTEZWGQB7V2CLS6GVKWM4B3F5QMT6BJ2UJH7D3O5XFJJJENOTK3YUD5",
    name: "Consultorio Dr. Martínez",
    type: "consultorio",
    address: "Col. Del Valle, CDMX",
    lat: 19.3960,
    lng: -99.1755,
    available_mxn: 8000,
    max_trade_mxn: 5000,
    min_trade_mxn: 500,
    tier: "espora",
    completion_rate: 0.75,
    trades_completed: 12,
    avg_time_minutes: 10,
    online: false,
  },
  // Insurgentes
  {
    id: "GM005",
    stellar_address: "GDFH2KLMNOPQRSTUVWXYZ12345678901234567890123456",
    name: "Farmacia Simi",
    type: "farmacia",
    address: "Av. Insurgentes 2500, Col. Del Valle, CDMX",
    lat: 19.3980,
    lng: -99.1680,
    available_mxn: 10000,
    max_trade_mxn: 5000,
    min_trade_mxn: 100,
    tier: "maestro",
    completion_rate: 0.97,
    trades_completed: 520,
    avg_time_minutes: 3,
    online: true,
  },
  // Centro Histórico
  {
    id: "GM006",
    stellar_address: "GEJK3LMNOPQRSTUVWXYZ12345678901234567890123456",
    name: "Tienda La Económica",
    type: "tienda",
    address: "Calle Regina 88, Centro, CDMX",
    lat: 19.4320,
    lng: -99.1360,
    available_mxn: 4000,
    max_trade_mxn: 2500,
    min_trade_mxn: 100,
    tier: "experto",
    completion_rate: 0.91,
    trades_completed: 180,
    avg_time_minutes: 6,
    online: true,
  },
  // Polanco
  {
    id: "GM007",
    stellar_address: "GFKL4MNOPQRSTUVWXYZ12345678901234567890123456",
    name: "Café Punta del Cielo",
    type: "restaurante",
    address: "Av. Homero 133, Polanco, CDMX",
    lat: 19.4285,
    lng: -99.1905,
    available_mxn: 6000,
    max_trade_mxn: 3000,
    min_trade_mxn: 200,
    tier: "maestro",
    completion_rate: 0.96,
    trades_completed: 450,
    avg_time_minutes: 4,
    online: true,
  },
  // Santa Fe
  {
    id: "GM008",
    stellar_address: "GGHM5MNOPQRSTUVWXYZ12345678901234567890123456",
    name: "OXXO Santa Fe",
    type: "tienda",
    address: "Av. Santa Fe 500, Santa Fe, CDMX",
    lat: 19.3580,
    lng: -99.2620,
    available_mxn: 8000,
    max_trade_mxn: 4000,
    min_trade_mxn: 100,
    tier: "experto",
    completion_rate: 0.94,
    trades_completed: 320,
    avg_time_minutes: 5,
    online: true,
  },
  // Juárez
  {
    id: "GM009",
    stellar_address: "GHIN6MNOPQRSTUVWXYZ12345678901234567890123456",
    name: "Lavandería Express",
    type: "servicio",
    address: "Av. Álvaro Obregón 250, Col. Juárez, CDMX",
    lat: 19.4245,
    lng: -99.1600,
    available_mxn: 2500,
    max_trade_mxn: 1500,
    min_trade_mxn: 100,
    tier: "activo",
    completion_rate: 0.85,
    trades_completed: 78,
    avg_time_minutes: 8,
    online: true,
  },
  // Coyoacán
  {
    id: "GM010",
    stellar_address: "GIJO7MNOPQRSTUVWXYZ12345678901234567890123456",
    name: "Carnicería El Norteño",
    type: "tienda",
    address: "Av. del Imán 45, Coyoacán, CDMX",
    lat: 19.3470,
    lng: -99.1610,
    available_mxn: 3500,
    max_trade_mxn: 2000,
    min_trade_mxn: 150,
    tier: "experto",
    completion_rate: 0.92,
    trades_completed: 210,
    avg_time_minutes: 6,
    online: true,
  },
  // Narvarte
  {
    id: "GM011",
    stellar_address: "GJKP8MNOPQRSTUVWXYZ12345678901234567890123456",
    name: "Farmacia Budapest",
    type: "farmacia",
    address: "Eje Central 450, Narvarte, CDMX",
    lat: 19.4050,
    lng: -99.1480,
    available_mxn: 7000,
    max_trade_mxn: 4000,
    min_trade_mxn: 100,
    tier: "maestro",
    completion_rate: 0.95,
    trades_completed: 380,
    avg_time_minutes: 4,
    online: true,
  },
  // Doctores
  {
    id: "GM012",
    stellar_address: "GKLR9MNOPQRSTUVWXYZ12345678901234567890123456",
    name: "Tortas Don Juan",
    type: "restaurante",
    address: "Calle Doctor Erasmo 12, Doctores, CDMX",
    lat: 19.4180,
    lng: -99.1400,
    available_mxn: 1500,
    max_trade_mxn: 1000,
    min_trade_mxn: 50,
    tier: "activo",
    completion_rate: 0.89,
    trades_completed: 95,
    avg_time_minutes: 5,
    online: true,
  },
];

export { MERCHANTS_DATA };

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface Provider {
  id: string;
  stellar_address: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  available_mxn: number;
  max_trade_mxn: number;
  min_trade_mxn: number;
  tier: ProviderTier;
  reputation: number;
  completion_rate: number;
  trades_completed: number;
  avg_time_minutes: number;
  online: boolean;
}

export interface MatchRequest {
  lat: number;
  lng: number;
  amount: number;
  user_address?: string;
}

export interface ScoredProvider extends Provider {
  distance_km: number;
  score: number;
}

const TIER_WEIGHTS: Record<ProviderTier, number> = {
  espora: 0.5,
  maestro: 1.0,
  experto: 0.8,
  activo: 0.65,
};

const REPUTATION_WEIGHT = 0.4;
const COMPLETION_WEIGHT = 0.35;
const DISTANCE_WEIGHT = 0.25;

function reputationFromTrades(trades: number, tier: ProviderTier): number {
  if (tier === "espora") return Math.min(0.3 + trades * 0.01, 0.5);
  if (tier === "maestro") return Math.min(0.7 + trades * 0.001, 0.95);
  return Math.min(0.6 + trades * 0.002, 0.9);
}

export function normalizeProviders(merchants: MerchantData[]): Provider[] {
  return merchants.map((m) => ({
    id: m.id,
    stellar_address: m.stellar_address,
    name: m.name,
    type: m.type,
    address: m.address,
    lat: m.lat,
    lng: m.lng,
    available_mxn: m.available_mxn,
    max_trade_mxn: m.max_trade_mxn,
    min_trade_mxn: m.min_trade_mxn,
    tier: m.tier as ProviderTier,
    reputation: reputationFromTrades(m.trades_completed, m.tier as ProviderTier),
    completion_rate: m.completion_rate,
    trades_completed: m.trades_completed,
    avg_time_minutes: m.avg_time_minutes,
    online: m.online,
  }));
}

const PROVIDERS = normalizeProviders(MERCHANTS_DATA);

export function findNearbyProviders(
  lat: number,
  lng: number,
  radiusKm: number,
  amount: number
): Provider[] {
  return PROVIDERS.filter((p) => {
    if (!p.online) return false;
    if (p.available_mxn < amount) return false;
    if (p.max_trade_mxn < amount) return false;
    if (p.min_trade_mxn > amount) return false;

    const distance = distanceKm(lat, lng, p.lat, p.lng);
    return distance <= radiusKm;
  });
}

export function scoreProvider(provider: Provider, userLat: number, userLng: number): number {
  const distance = distanceKm(userLat, userLng, provider.lat, provider.lng);
  const maxDistance = 10;
  const normalizedDistance = Math.max(0, 1 - distance / maxDistance);

  const normalizedReputation = provider.reputation;
  const normalizedCompletion = provider.completion_rate;
  const tierBonus = TIER_WEIGHTS[provider.tier];

  const score =
    REPUTATION_WEIGHT * normalizedReputation +
    COMPLETION_WEIGHT * normalizedCompletion +
    DISTANCE_WEIGHT * normalizedDistance +
    tierBonus * 0.1;

  return Math.min(Math.max(score, 0), 1);
}

export function matchUser(request: MatchRequest): ScoredProvider | null {
  const nearbyProviders = findNearbyProviders(
    request.lat,
    request.lng,
    50,
    request.amount
  );

  if (nearbyProviders.length === 0) return null;

  const scoredProviders: ScoredProvider[] = nearbyProviders.map((p) => ({
    ...p,
    distance_km: parseFloat(distanceKm(request.lat, request.lng, p.lat, p.lng).toFixed(2)),
    score: scoreProvider(p, request.lat, request.lng),
  }));

  scoredProviders.sort((a, b) => b.score - a.score);

  return scoredProviders[0];
}

export function getTopProviders(
  request: MatchRequest,
  limit: number = 5
): ScoredProvider[] {
  const nearbyProviders = findNearbyProviders(
    request.lat,
    request.lng,
    50,
    request.amount
  );

  if (nearbyProviders.length === 0) return [];

  const scoredProviders: ScoredProvider[] = nearbyProviders.map((p) => ({
    ...p,
    distance_km: parseFloat(distanceKm(request.lat, request.lng, p.lat, p.lng).toFixed(2)),
    score: scoreProvider(p, request.lat, request.lng),
  }));

  return scoredProviders
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export { PROVIDERS };

export interface ScoredMerchant {
  id: string;
  stellar_address: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  available_mxn: number;
  max_trade_mxn: number;
  min_trade_mxn: number;
  tier: ProviderTier;
  reputation: number;
  completion_rate: number;
  trades_completed: number;
  avg_time_minutes: number;
  online: boolean;
  distance_km: number;
  score: number;
}

let dbAvailable = false;

async function checkDbAvailability(): Promise<boolean> {
  if (dbAvailable) return true;
  try {
    const { query } = await import('../db/schema.js');
    await query('SELECT 1');
    dbAvailable = true;
    return true;
  } catch {
    return false;
  }
}

export async function getScoredMerchantsFromDB(
  lat: number,
  lng: number,
  amount: number,
  limit: number = 5
): Promise<ScoredMerchant[]> {
  const isDbAvailable = await checkDbAvailability();
  if (!isDbAvailable) {
    console.warn('[P2P Matching] DB unavailable, using mock data');
    const mock = getTopProviders({ lat, lng, amount }, limit);
    return mock.map(p => ({
      ...p,
      distance_km: p.distance_km,
    }));
  }

  try {
    const { getMany, query } = await import('../db/schema.js');

    const rows = await getMany<{
      id: string;
      stellar_address: string;
      name: string;
      type: string;
      address: string;
      lat: string;
      lng: string;
      available_mxn: string;
      max_trade_mxn: string;
      min_trade_mxn: string;
      tier: string;
      completion_rate: string;
      trades_completed: string;
      avg_time_minutes: string;
      online: boolean;
      volume_usdc: string;
      distance: string;
    }>(`
      SELECT *,
        (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($1)) * cos(radians(lat)) *
            cos(radians(lng) - radians($2)) +
            sin(radians($1)) * sin(radians(lat))
          ))
        )) AS distance
      FROM p2p_merchants
      WHERE online = TRUE
        AND status IN ('active', 'verified')
        AND available_mxn >= $3
        AND max_trade_mxn >= $3
        AND min_trade_mxn <= $3
        AND lat IS NOT NULL
        AND lng IS NOT NULL
      HAVING (6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians($1)) * cos(radians(lat)) *
          cos(radians(lng) - radians($2)) +
          sin(radians($1)) * sin(radians(lat))
        ))
      )) <= 50
      ORDER BY distance ASC
      LIMIT $4
    `, [lat, lng, amount, limit]);

    const scored: ScoredMerchant[] = rows.map(row => {
      const tier = row.tier as ProviderTier;
      const trades = parseInt(row.trades_completed, 10);
      const volume = parseFloat(row.volume_usdc);
      const distance = parseFloat(row.distance);

      const reputation = reputationFromTrades(trades, tier);
      const completionRate = parseFloat(row.completion_rate);
      const tierBonus = TIER_WEIGHTS[tier];

      const maxDistance = 10;
      const normalizedDistance = Math.max(0, 1 - distance / maxDistance);

      const score =
        REPUTATION_WEIGHT * reputation +
        COMPLETION_WEIGHT * completionRate +
        DISTANCE_WEIGHT * normalizedDistance +
        tierBonus * 0.1;

      return {
        id: row.id,
        stellar_address: row.stellar_address,
        name: row.name,
        type: row.type,
        address: row.address || '',
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        available_mxn: parseFloat(row.available_mxn),
        max_trade_mxn: parseFloat(row.max_trade_mxn),
        min_trade_mxn: parseFloat(row.min_trade_mxn),
        tier,
        reputation,
        completion_rate: completionRate,
        trades_completed: trades,
        avg_time_minutes: parseInt(row.avg_time_minutes, 10),
        online: row.online,
        distance_km: parseFloat(distance.toFixed(2)),
        score: Math.min(Math.max(score, 0), 1),
      };
    });

    return scored.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('[P2P Matching] DB query failed, falling back to mock:', error);
    const mock = getTopProviders({ lat, lng, amount }, limit);
    return mock.map(p => ({
      ...p,
      distance_km: p.distance_km,
    }));
  }
}

export async function getMerchantFromDB(stellarAddress: string): Promise<ScoredMerchant | null> {
  const isDbAvailable = await checkDbAvailability();
  if (!isDbAvailable) {
    return MERCHANTS_DATA.find(m => m.stellar_address === stellarAddress) as ScoredMerchant | null;
  }

  try {
    const { getOne } = await import('../db/schema.js');

    const row = await getOne<{
      id: string;
      stellar_address: string;
      name: string;
      type: string;
      address: string;
      lat: string;
      lng: string;
      available_mxn: string;
      max_trade_mxn: string;
      min_trade_mxn: string;
      tier: string;
      completion_rate: string;
      trades_completed: string;
      avg_time_minutes: string;
      online: boolean;
      volume_usdc: string;
    }>('SELECT * FROM p2p_merchants WHERE stellar_address = $1', [stellarAddress]);

    if (!row) return null;

    const tier = row.tier as ProviderTier;
    const trades = parseInt(row.trades_completed, 10);

    return {
      id: row.id,
      stellar_address: row.stellar_address,
      name: row.name,
      type: row.type,
      address: row.address || '',
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      available_mxn: parseFloat(row.available_mxn),
      max_trade_mxn: parseFloat(row.max_trade_mxn),
      min_trade_mxn: parseFloat(row.min_trade_mxn),
      tier,
      reputation: reputationFromTrades(trades, tier),
      completion_rate: parseFloat(row.completion_rate),
      trades_completed: trades,
      avg_time_minutes: parseInt(row.avg_time_minutes, 10),
      online: row.online,
      distance_km: 0,
      score: 0,
    };
  } catch (error) {
    console.error('[P2P Matching] DB lookup failed, falling back to mock:', error);
    return MERCHANTS_DATA.find(m => m.stellar_address === stellarAddress) as ScoredMerchant | null;
  }
}
