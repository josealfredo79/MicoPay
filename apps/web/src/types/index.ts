export interface UserData {
  id: string;
  username: string;
  token: string;
}

export interface TradeData {
  id: string;
  status: string;
  secret_hash: string;
  amount_mxn: number;
}

export interface TradeHistoryItem {
  id: string;
  status: string;
  amount_mxn: number;
  platform_fee_mxn: number;
  lock_tx_hash: string | null;
  release_tx_hash: string | null;
  created_at: string;
  seller_id: string;
  buyer_id: string;
}

export interface AccountBalance {
  xlm: string;
  address: string;
}

export interface Agent {
  id: string;
  stellar_address: string;
  name: string;
  type: string;
  address: string;
  distance_km: number;
  available_mxn: number;
  max_trade_mxn: number;
  tier: string;
  reputation: number;
  completion_rate: number;
  trades_completed: number;
  online: boolean;
  usdc_rate: number;
  amount_usdc_needed: number;
  avatar_url?: string;
  latitude?: number;
  longitude?: number;
  score?: number;
  avg_time_minutes?: number;
  min_trade_mxn?: number;
}

export interface CashRequestResponse {
  request_id: string;
  status: string;
  merchant: {
    name: string;
    address: string;
    stellar_address: string;
    tier: string;
  };
  exchange: {
    amount_mxn: number;
    amount_usdc: string;
    rate_usdc_mxn: number;
    htlc_tx_hash: string;
    htlc_explorer_url: string;
  };
  qr_payload: string;
  claim_url: string;
  instructions: string;
  expires_at: string;
  merchant_address?: string;
  merchant_name?: string;
  amount_mxn_value?: number;
  amount_usdc_value?: string;
  htlc_tx_hash?: string;
  htlc_explorer_url?: string;
  created_at?: string;
}

export interface AgentsResponse {
  agents: Agent[];
  usdc_mxn_rate: number;
  timestamp: string;
}

export interface RateResponse {
  pair: string;
  rate: number;
  timestamp: string;
}
