import axios from 'axios';
import type {
  UserData,
  TradeData,
  TradeHistoryItem,
  AccountBalance,
  Agent,
  CashRequestResponse,
  AgentsResponse,
  RateResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const http = axios.create({ baseURL: BASE_URL });

function authHeaders(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

function randomAddress(prefix: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let address = 'G' + prefix.toUpperCase().replace(/[^A-Z2-7]/g, 'A');
  while (address.length < 56) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address.substring(0, 56);
}

// User API
async function registerUser(username: string): Promise<UserData> {
  const stellar_address = randomAddress(username.substring(0, 6));
  const res = await http.post('/users/register', { username, stellar_address });
  return { ...res.data.user, token: res.data.token };
}

// Trades API
async function createTrade(
  sellerId: string,
  amountMxn: number,
  buyerToken: string,
): Promise<TradeData> {
  const res = await http.post(
    '/trades',
    { seller_id: sellerId, amount_mxn: amountMxn },
    authHeaders(buyerToken),
  );
  return res.data.trade;
}

async function lockTrade(tradeId: string, sellerToken: string): Promise<{ lock_tx_hash: string }> {
  const res = await http.post(
    `/trades/${tradeId}/lock`,
    {},
    authHeaders(sellerToken),
  );
  return { lock_tx_hash: res.data.lock_tx_hash };
}

async function revealTrade(tradeId: string, sellerToken: string): Promise<void> {
  await http.post(`/trades/${tradeId}/reveal`, undefined, authHeaders(sellerToken));
}

async function getSecret(
  tradeId: string,
  sellerToken: string,
): Promise<{ secret: string; qr_payload: string }> {
  const res = await http.get(`/trades/${tradeId}/secret`, authHeaders(sellerToken));
  return res.data;
}

async function completeTrade(tradeId: string, buyerToken: string): Promise<void> {
  await http.post(`/trades/${tradeId}/complete`, {}, authHeaders(buyerToken));
}

async function getTradeHistory(token: string): Promise<TradeHistoryItem[]> {
  const res = await http.get('/trades/history', authHeaders(token));
  return res.data.trades;
}

async function getAccountBalance(): Promise<AccountBalance> {
  const res = await http.get('/account/balance');
  return res.data;
}

// Cash API
async function getAgents(lat: number, lng: number, amount: number, limit = 10): Promise<AgentsResponse> {
  const res = await http.get('/api/v1/cash/agents', {
    params: { lat, lng, amount, limit },
    headers: { 'x-payment': 'demo' },
  });
  return res.data;
}

async function createCashRequest(
  merchantAddress: string,
  amountMxn: number,
): Promise<CashRequestResponse> {
  const res = await http.post(
    '/api/v1/cash/request',
    { merchant_address: merchantAddress, amount_mxn: amountMxn },
    { headers: { 'x-payment': 'demo' } },
  );
  return res.data;
}

async function getCashRequest(requestId: string): Promise<CashRequestResponse> {
  const res = await http.get(`/api/v1/cash/request/${requestId}`);
  return res.data;
}

async function getCashRate(): Promise<RateResponse> {
  const res = await http.get('/api/v1/cash/rate');
  return res.data;
}

export const api = {
  user: {
    register: registerUser,
  },
  trades: {
    create: createTrade,
    lock: lockTrade,
    reveal: revealTrade,
    getSecret,
    complete: completeTrade,
    getHistory: getTradeHistory,
  },
  account: {
    getBalance: getAccountBalance,
  },
  cash: {
    getAgents,
    createRequest: createCashRequest,
    getRequest: getCashRequest,
    getRate: getCashRate,
  },
};
