import { Card, CardContent } from '../ui';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';

export interface Merchant {
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
}

interface MerchantCardProps {
  merchant: Merchant;
  amountMxn: number;
  commission: number;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  isBestOffer?: boolean;
}

const tierEmoji: Record<Merchant['tier'], string> = {
  espora: '🌱',
  activo: '🔥',
  experto: '⭐',
  maestro: '🍄',
};

const typeIcon: Record<Merchant['type'], string> = {
  tienda: 'storefront',
  farmacia: 'local_pharmacy',
  restaurant: 'restaurant',
  otro: 'business',
};

export function MerchantCard({
  merchant,
  amountMxn,
  commission,
  onSelect,
  isLoading,
  isBestOffer,
}: MerchantCardProps) {
  const receiveAmount = amountMxn - commission;

  return (
    <div className="relative">
      {isBestOffer && (
        <div className="absolute -top-3 left-6 z-10">
          <Badge variant="primary">Mejor oferta</Badge>
        </div>
      )}

      <Card
        variant="elevated"
        onClick={() => merchant.online && onSelect(merchant.stellar_address)}
        className={`${isBestOffer ? 'ring-2 ring-primary' : ''}`}
      >
        <CardContent className="flex flex-col gap-4 p-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
              <Avatar
                src={merchant.avatar_url}
                fallback={merchant.name}
                size="lg"
              />
              <div>
                <div className="flex items-center gap-1">
                  <h3 className="font-bold text-lg">{merchant.name}</h3>
                  <span>{tierEmoji[merchant.tier]}</span>
                </div>
                <div className="flex items-center gap-1 text-on-surface-variant text-xs">
                  <span className="material-symbols-outlined text-xs">near_me</span>
                  <span>{formatDistance(merchant.distance_km)}</span>
                  <span>•</span>
                  <span className="text-primary">{merchant.trades_completed} trades</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="block text-xs text-on-surface-variant font-label uppercase">Comisión</span>
              <span className="text-primary font-bold">${commission} MXN</span>
            </div>
          </div>

          {/* Exchange Rate */}
          <div className="bg-surface-container-low rounded-lg p-4 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tight">
                Enviamos
              </p>
              <p className="font-bold text-on-surface">${amountMxn} MXN</p>
            </div>
            <span className="material-symbols-outlined text-outline-variant">trending_flat</span>
            <div className="space-y-1 text-right">
              <p className="text-[10px] text-accent uppercase font-bold tracking-tight">Recibes</p>
              <p className="font-bold text-on-surface text-lg">${receiveAmount} MXN</p>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => onSelect(merchant.stellar_address)}
            disabled={isLoading || !merchant.online}
            className="w-full h-[46px] bg-gradient-to-r from-primary to-primary-container text-white font-semibold rounded-lg shadow-md active:scale-95 duration-200 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!merchant.online
              ? 'Agente no disponible'
              : isLoading
              ? 'Bloqueando fondos…'
              : 'Aceptar esta oferta'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}
