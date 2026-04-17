import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface BalanceDisplayProps {
  xlmBalance: string | null;
  mxnBalance: string;
  stellarAddress: string;
  isLoading?: boolean;
  className?: string;
}

export function BalanceDisplay({
  xlmBalance,
  mxnBalance,
  stellarAddress,
  isLoading,
  className = '',
}: BalanceDisplayProps) {
  if (isLoading) {
    return (
      <Card variant="elevated" className={`bg-primary ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-3 w-24 bg-white/20 rounded" />
            <div className="h-8 w-32 bg-white/20 rounded" />
            <div className="h-4 w-40 bg-white/20 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className={`bg-primary overflow-hidden relative ${className}`}>
      {/* Decorative background */}
      <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
        <svg fill="none" height="180" viewBox="0 0 24 24" width="180" xmlns="http://www.w3.org/2000/svg">
          <circle cx="7" cy="7" r="3" stroke="#D4E4EC" strokeWidth="1.5" />
          <circle cx="17" cy="17" r="3" stroke="#D4E4EC" strokeWidth="1.5" />
          <path d="M10 10L14 14" stroke="#D4E4EC" strokeWidth="1.5" />
        </svg>
      </div>

      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <p className="text-[10px] font-bold tracking-[0.15em] text-white/70 uppercase">
            Saldo Total
          </p>
          <Badge variant="default" className="bg-white/10 text-white border-0">
            Testnet
          </Badge>
        </div>

        <div className="mb-4">
          <h2 className="text-4xl font-headline font-extrabold text-white tracking-tight">
            ${mxnBalance} MXN
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#5DCAA5] animate-pulse shadow-[0_0_8px_#5DCAA5]" />
          <p className="text-[#5DCAA5] text-sm font-bold">
            {xlmBalance ? `${xlmBalance} XLM` : 'Sin conexión'}
          </p>
        </div>

        {stellarAddress && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-[10px] text-white/50 font-mono truncate">
              {stellarAddress.substring(0, 8)}...{stellarAddress.slice(-6)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AssetRowProps {
  name: string;
  symbol: string;
  balance: string;
  mxnValue: string;
  icon: React.ReactNode;
  isPending?: boolean;
}

export function AssetRow({
  name,
  symbol,
  balance,
  mxnValue,
  icon,
  isPending,
}: AssetRowProps) {
  return (
    <div className={`flex items-center gap-4 p-4 ${isPending ? 'opacity-40' : ''}`}>
      <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-on-surface text-sm">{name}</p>
        <p className="text-[11px] text-outline font-mono">
          {symbol}
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold text-on-surface text-sm">{balance}</p>
        <p className="text-[11px] text-outline">${mxnValue}</p>
      </div>
    </div>
  );
}
