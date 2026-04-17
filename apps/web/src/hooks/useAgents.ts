import { useEffect, useState } from 'react';
import { api } from '../services/api';

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
}

interface UseAgentsOptions {
  lat: number;
  lng: number;
  amount: number;
  limit?: number;
}

interface UseAgentsReturn {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAgents({ lat, lng, amount, limit = 10 }: UseAgentsOptions): UseAgentsReturn {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.cash.getAgents(lat, lng, amount, limit);
      setAgents(data.agents);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError('No se pudieron cargar los agentes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [lat, lng, amount, limit]);

  return { agents, isLoading, error, refetch: fetchAgents };
}
