import { useState, useEffect } from 'react';
import { getCETESRate, buyCETES, sellCETES, type CETESRate, type CETESTxResult } from '../../services/defi';
import { Logo } from '../../components/layout/Logo';
import { useWallet } from '../../contexts/AuthContext';

type Tab = 'buy' | 'sell';
type SourceAsset = 'XLM' | 'USDC' | 'MXNe';

interface SavingsProps {
  onBack?: () => void;
}

export default function Savings({ onBack }: SavingsProps) {
  const { publicKey } = useWallet();
  const [tab, setTab] = useState<Tab>('buy');
  const [amount, setAmount] = useState('');
  const [sourceAsset, setSourceAsset] = useState<SourceAsset>('XLM');
  const [rate, setRate] = useState<CETESRate | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txResult, setTxResult] = useState<CETESTxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCETESRate()
      .then(setRate)
      .catch((err) => {
        console.error('Failed to fetch CETES rate:', err);
        setRateError('No se pudo cargar la tasa. Usando valores por defecto.');
      })
      .finally(() => setRateLoading(false));
  }, []);

  const cetesPreview = (): string => {
    if (!amount || isNaN(parseFloat(amount))) return '—';
    const num = parseFloat(amount);
    const priceMxn = rate?.cesPriceMxn ?? 1.157;
    const xlmRate = rate?.xlmPerUsdc ?? 17.5;
    const mxnRate = 17.5;
    
    if (tab === 'buy') {
      if (sourceAsset === 'XLM') {
        const usdc = num / xlmRate;
        const mxn = usdc * mxnRate;
        const cetes = mxn / priceMxn;
        return cetes.toFixed(2);
      }
      if (sourceAsset === 'USDC') {
        const mxn = num * mxnRate;
        return (mxn / priceMxn).toFixed(2);
      }
      return (num / priceMxn).toFixed(2);
    } else {
      const mxn = num * priceMxn;
      if (sourceAsset === 'XLM') {
        return ((mxn / mxnRate) * xlmRate).toFixed(2);
      }
      if (sourceAsset === 'USDC') return (mxn / mxnRate).toFixed(2);
      return mxn.toFixed(2);
    }
  };

  const handleTx = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setTxLoading(true);
    setError(null);
    setTxResult(null);
    try {
      const result =
        tab === 'buy'
          ? await buyCETES(amount, sourceAsset)
          : await sellCETES(amount, sourceAsset);
      setTxResult(result);
      setAmount('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setTxLoading(false);
    }
  };

  const shortHash = (h: string) => (h.length > 16 ? `${h.slice(0, 8)}…${h.slice(-8)}` : h);

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col pb-10">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center gap-4 px-4 py-4 backdrop-blur-md bg-white/90 border-b border-outline-variant/10">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <Logo />
        <div className="ml-auto bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
          <span className="text-primary font-bold text-sm">{rate?.apy ?? 5.6}% APY</span>
        </div>
      </header>

      <main className="flex-1 mt-20 px-4 pt-4 space-y-5">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-[24px] p-5 border border-primary/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-primary">trending_up</span>
            </div>
            <div>
              <p className="font-bold text-on-surface text-base">CETES Tokenizados</p>
              {rateLoading ? (
                <p className="text-xs text-outline flex items-center gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  Cargando tasa...
                </p>
              ) : rateError ? (
                <p className="text-xs text-yellow-600">{rateError}</p>
              ) : (
                <p className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {rate?.note}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 rounded-2xl p-3 text-center">
              {rateLoading ? (
                <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <>
                  <p className="text-2xl font-extrabold text-primary">{rate?.apy ?? 5.6}%</p>
                  <p className="text-xs text-on-surface-variant mt-1">APY anual</p>
                </>
              )}
            </div>
            <div className="bg-white/60 rounded-2xl p-3 text-center">
              {rateLoading ? (
                <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <>
                  <p className="text-2xl font-extrabold text-on-surface">
                    {((rate?.apy ?? 5.6) / 12).toFixed(2)}%
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">APY mensual</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 bg-surface-container-low rounded-2xl p-1">
          {(['buy', 'sell'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setTxResult(null); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                tab === t
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-on-surface-variant'
              }`}
            >
              {t === 'buy' ? 'Comprar' : 'Vender'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[24px] p-5 border border-outline-variant/10 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wide">
              {tab === 'buy' ? 'Pagar con' : 'Recibir en'}
            </label>
            <div className="flex gap-2">
              {(['XLM', 'USDC', 'MXNe'] as SourceAsset[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setSourceAsset(a)}
                  className={`flex-1 py-2 rounded-xl font-bold text-sm border transition-all ${
                    sourceAsset === a
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-on-surface-variant border-outline-variant/30'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wide">
              {tab === 'buy' ? `Cantidad en ${sourceAsset}` : 'Cantidad en CETES'}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3 text-xl font-bold text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="bg-primary/5 rounded-2xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-on-surface-variant">
                {tab === 'buy' ? 'Recibirás ~' : 'Recibirás ~'}
              </span>
              <span className="font-bold text-on-surface">
                {cetesPreview()} {tab === 'buy' ? 'CETES' : sourceAsset}
              </span>
            </div>
          )}

          {error && (
            <div className="bg-error/10 border border-error/20 rounded-2xl px-4 py-3">
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
          )}

          {txResult && (
            <div className="bg-[#e6f9f1] border border-[#1D9E75]/20 rounded-2xl px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1D9E75] text-xl">check_circle</span>
                <p className="font-bold text-[#1D9E75]">
                  {txResult.simulated ? '¡Transacción simulada!' : '¡Enviada!'}
                </p>
              </div>
              <p className="text-xs text-on-surface-variant">
                Hash: <span className="font-mono">{shortHash(txResult.hash)}</span>
              </p>
              {txResult.cetesReceived && (
                <p className="text-sm font-bold text-on-surface">
                  +{txResult.cetesReceived} CETES acreditados
                </p>
              )}
              {txResult.destReceived && (
                <p className="text-sm font-bold text-on-surface">
                  +{txResult.destReceived} {sourceAsset}
                </p>
              )}
              <a
                href={txResult.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary font-bold"
              >
                Ver en Explorer
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
            </div>
          )}

          <button
            onClick={handleTx}
            disabled={txLoading || !amount || parseFloat(amount) <= 0}
            className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {txLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                Procesando…
              </>
            ) : tab === 'buy' ? (
              <>
                Comprar CETES
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </>
            ) : (
              <>
                Vender CETES
                <span className="material-symbols-outlined text-lg">swap_horiz</span>
              </>
            )}
          </button>
        </div>

        {publicKey && (
          <div className="bg-white rounded-[24px] p-4 border border-outline-variant/10">
            <p className="text-xs text-on-surface-variant mb-2">Tu wallet</p>
            <p className="font-mono text-sm text-on-surface">{publicKey.slice(0, 8)}...{publicKey.slice(-6)}</p>
          </div>
        )}

        <p className="text-center text-xs text-outline pb-4">
          CETES via Etherfuse · Red Stellar · {rate?.network ?? 'TESTNET'}
        </p>
      </main>
    </div>
  );
}