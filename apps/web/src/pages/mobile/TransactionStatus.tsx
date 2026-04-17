import { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';
import type { CashRequestResponse } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface TransactionStatusProps {
  requestId: string;
  onBack: () => void;
  onComplete: () => void;
  onExpire: () => void;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    color: 'warning',
    icon: 'schedule',
    description: 'Esperando confirmación del agente',
  },
  accepted: {
    label: 'Aceptado',
    color: 'primary',
    icon: 'check_circle',
    description: 'El agente aceptó tu solicitud',
  },
  completed: {
    label: 'Completado',
    color: 'success',
    icon: 'verified',
    description: '¡Transacción exitosa!',
  },
  expired: {
    label: 'Expirado',
    color: 'error',
    icon: 'cancel',
    description: 'La solicitud expiró',
  },
} as const;

export function TransactionStatus({
  requestId,
  onBack,
  onComplete,
  onExpire,
}: TransactionStatusProps) {
  const [request, setRequest] = useState<CashRequestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.cash.getRequest(requestId);
      setRequest(data);
      setError(null);

      if (data.status === 'completed') {
        onComplete();
      } else if (data.status === 'expired') {
        onExpire();
      }
    } catch (err) {
      setError('No se pudo obtener el estado de la transacción');
    } finally {
      setIsLoading(false);
    }
  }, [requestId, onComplete, onExpire]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (!request?.expires_at) return;

    const updateTimer = () => {
      const now = Date.now();
      const expires = new Date(request.expires_at).getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [request?.expires_at]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-primary animate-spin">
            progress_activity
          </span>
          <p className="mt-4 text-on-surface-variant">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <Card variant="elevated" className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <span className="material-symbols-outlined text-6xl text-error mb-4">
              error
            </span>
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p className="text-on-surface-variant mb-6">{error || 'Solicitud no encontrada'}</p>
            <Button onClick={onBack}>Volver</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[request.status];
  const isPending = request.status === 'pending' || request.status === 'accepted';

  return (
    <div className="min-h-screen bg-surface pb-32">
      {/* Header */}
      <header className="bg-primary text-white p-6 pb-24 rounded-b-[32px]">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-bold text-lg">Estado de Transacción</h1>
          <div className="w-10" />
        </div>

        <div className="text-center">
          <Badge variant={statusConfig.color as 'primary' | 'success' | 'warning' | 'error'}>
            {statusConfig.label}
          </Badge>
          <p className="mt-2 text-white/80 text-sm">{statusConfig.description}</p>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 -mt-16">
        <Card variant="elevated" className="w-full max-w-md mx-auto mb-6">
          <CardContent className="p-6 space-y-6">
            {/* Amount */}
            <div className="text-center">
              <p className="text-xs text-on-surface-variant uppercase tracking-wide mb-1">
                Monto
              </p>
              <p className="text-4xl font-bold text-primary">
                ${request.amount_mxn.toLocaleString('es-MX')} MXN
              </p>
            </div>

            {/* Exchange Info */}
            <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Tasa</span>
                <span className="font-medium">
                  {request.exchange.rate_usdc_mxn.toFixed(4)} USDC/MXN
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">En USDC</span>
                <span className="font-medium">{request.exchange.amount_usdc} USDC</span>
              </div>
              <div className="border-t border-outline-variant/20 pt-3 flex justify-between text-sm">
                <span className="text-on-surface-variant">Comisión MicoPay</span>
                <span className="font-medium text-primary">$0 MXN</span>
              </div>
            </div>

            {/* Timer */}
            {isPending && timeLeft !== null && (
              <div className="text-center">
                <p className="text-xs text-on-surface-variant uppercase tracking-wide mb-2">
                  Tiempo restante
                </p>
                <div className="inline-flex items-center gap-2 bg-warning/10 text-warning px-4 py-2 rounded-full">
                  <span className="material-symbols-outlined text-lg">timer</span>
                  <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
                </div>
              </div>
            )}

            {/* TX Hash */}
            <div className="space-y-2">
              <p className="text-xs text-on-surface-variant uppercase tracking-wide">
                Hash de transacción
              </p>
              <a
                href={request.htlc_explorer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-primary">link</span>
                <span className="font-mono text-sm truncate flex-1">
                  {request.htlc_tx_hash}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant text-sm">
                  open_in_new
                </span>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        {isPending && (
          <Card variant="outlined" className="w-full max-w-md mx-auto">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary">info</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1">¿Qué sigue?</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Ve al agente seleccionado y muéstrale el código QR o tu ID de solicitud.
                    El agente acreditará el efectivo una vez que verifique la transacción en blockchain.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
