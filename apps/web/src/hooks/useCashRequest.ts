import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';

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
        setRequest(result);
        return result;
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
      setRequest(updated);
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
