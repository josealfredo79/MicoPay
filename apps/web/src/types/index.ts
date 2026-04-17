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
  type: 'tienda' | 'farmacia' | 'restaurant' | 'otro';
  address: string;
  distance_km: number;
  available_mxn: number;
  max_trade_mxn: number;
  tier: 'espora' | 'activo' | 'experto' | 'maestro';
  reputation: number;
  completion_rate: number;
  trades_completed: number;
  online: boolean;
  usdc_rate: number;
  amount_usdc_needed: number;
  avatar_url?: string;
  latitude: number;
  longitude: number;
}

export interface CashRequestResponse {
  request_id: string;
  merchant_address: string;
  merchant_name: string;
  amount_mxn: number;
  amount_usdc: string;
  status: 'pending' | 'accepted' | 'completed' | 'expired';
  qr_payload: string;
  htlc_tx_hash: string;
  htlc_explorer_url: string;
  exchange: {
    rate_usdc_mxn: number;
    amount_mxn: number;
    amount_usdc: string;
  };
  claim_url: string;
  created_at: string;
  expires_at: string;
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
