import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import type { CashRequestResponse } from '../types';

export interface CashRequest {
  request_id: string;
  merchant_address: string;
  merchant_name: string;
  amount_mxn: number;
  amount_usdc: string;
  status: 'pending' | 'accepted' | 'completed' | 'expired';
  qr_payload: string;
  htlc_tx_hash: string;
  created_at: string;
  expires_at: string;
}

function mapToCashRequest(resp: CashRequestResponse): CashRequest {
  return {
    request_id: resp.request_id,
    merchant_address: resp.merchant?.stellar_address || resp.merchant_address || '',
    merchant_name: resp.merchant?.name || resp.merchant_name || '',
    amount_mxn: resp.exchange?.amount_mxn || resp.amount_mxn_value || 0,
    amount_usdc: resp.exchange?.amount_usdc || resp.amount_usdc_value || '0',
    status: resp.status as 'pending' | 'accepted' | 'completed' | 'expired',
    qr_payload: resp.qr_payload,
    htlc_tx_hash: resp.exchange?.htlc_tx_hash || resp.htlc_tx_hash || '',
    created_at: resp.created_at || new Date().toISOString(),
    expires_at: resp.expires_at,
  };
}

interface UseCashRequestReturn {
  request: CashRequest | null;
  isLoading: boolean;
  error: string | null;
  createRequest: (merchantAddress: string, amountMxn: number) => Promise<CashRequest | null>;
  pollStatus: () => Promise<void>;
}

export function useCashRequest(): UseCashRequestReturn {
  const [request, setRequest] = useState<CashRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRequest = useCallback(
    async (merchantAddress: string, amountMxn: number): Promise<CashRequest | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.cash.createRequest(merchantAddress, amountMxn);
        const mapped = mapToCashRequest(result);
        setRequest(mapped);
        return mapped;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error creando solicitud';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const pollStatus = useCallback(async () => {
    if (!request?.request_id) return;
    try {
      const updated = await api.cash.getRequest(request.request_id);
      setRequest(mapToCashRequest(updated));
    } catch (err) {
      console.error('Failed to poll status:', err);
    }
  }, [request?.request_id]);

  useEffect(() => {
    if (!request?.request_id || request.status !== 'pending') return;
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [request?.request_id, request?.status, pollStatus]);

  return { request, isLoading, error, createRequest, pollStatus };
}
