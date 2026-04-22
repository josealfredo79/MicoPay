import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL === '/api' ? '' : (import.meta.env.VITE_API_URL ?? 'http://localhost:3000');

const http = axios.create({ baseURL: BASE_URL });

export interface CETESRate {
  apy: number;
  xlmPerUsdc: number;
  cetesIssuer: string;
  cesPriceMxn: number;
  network: string;
  note: string;
  source: string;
  raw?: Record<string, unknown>;
}

export interface CETESTxResult {
  hash: string;
  status: string;
  simulated: boolean;
  amount: string;
  sourceAsset?: string;
  cetesReceived?: string;
  destReceived?: string;
  explorerUrl: string;
  note?: string;
}

export async function getCETESRate(amount = '100'): Promise<CETESRate> {
  const res = await http.get(`/defi/cetes/rate?amount=${amount}`);
  return res.data;
}

export async function buyCETES(amount: string, sourceAsset: 'XLM' | 'USDC' | 'MXNe'): Promise<CETESTxResult> {
  const res = await http.post('/defi/cetes/buy', { amount, sourceAsset });
  return res.data;
}

export async function sellCETES(amount: string, destAsset: 'XLM' | 'USDC' | 'MXNe'): Promise<CETESTxResult> {
  const res = await http.post('/defi/cetes/sell', { amount, destAsset });
  return res.data;
}

export interface SavingsPosition {
  cetesBalance: number;
  totalValueMxn: number;
  accruedYieldMxn: number;
  lastUpdated: string;
}

export async function getSavingsPositions(walletAddress: string): Promise<SavingsPosition> {
  const res = await http.get(`/savings/positions`, {
    params: { address: walletAddress },
    headers: { 'x-payment': 'demo' },
  });
  return res.data;
}