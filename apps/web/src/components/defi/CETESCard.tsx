import { useState, useEffect } from 'react';
import { getCETESRate, type CETESRate } from '../../services/defi';
import { Logo } from '../layout/Logo';

interface CETESCardProps {
  onBuy?: () => void;
  onLearnMore?: () => void;
}

export function CETESCard({ onBuy, onLearnMore }: CETESCardProps) {
  const [rate, setRate] = useState<CETESRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getCETESRate()
      .then(setRate)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const apy = rate?.apy ?? 11.45;
  const monthlyApy = (apy / 12).toFixed(2);
  const priceMxn = rate?.cesPriceMxn ?? 1.156;
  const source = rate?.source ?? 'fallback';

  return (
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-[24px] p-5 border border-primary/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-primary">trending_up</span>
          </div>
          <div>
            <h3 className="font-headline font-bold text-lg text-on-surface">CETES Tokenizados</h3>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Bonos del Gobierno de México</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${source === 'etherfuse' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {source === 'etherfuse' ? 'LIVE' : 'DEMO'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/60 rounded-2xl p-3 text-center">
          {loading ? (
            <div className="h-8 bg-gray-200 animate-pulse rounded" />
          ) : (
            <>
              <p className="text-2xl font-extrabold text-primary">{apy}%</p>
              <p className="text-xs text-on-surface-variant">APY anual</p>
            </>
          )}
        </div>
        <div className="bg-white/60 rounded-2xl p-3 text-center">
          {loading ? (
            <div className="h-8 bg-gray-200 animate-pulse rounded" />
          ) : (
            <>
              <p className="text-2xl font-extrabold text-on-surface">${monthlyApy}%</p>
              <p className="text-xs text-on-surface-variant">APY mensual</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-error mb-3">No se pudieron cargar las tasas en tiempo real</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onBuy}
          className="flex-1 bg-primary text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Invertir
        </button>
        <button
          onClick={onLearnMore}
          className="px-4 py-2.5 border border-outline-variant/30 rounded-xl text-on-surface-variant font-medium active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined">info</span>
        </button>
      </div>

      <p className="text-[10px] text-on-surface-variant mt-3 text-center">
        1 CETES ≈ ${priceMxn.toFixed(3)} MXN · Red Stellar
      </p>
    </div>
  );
}