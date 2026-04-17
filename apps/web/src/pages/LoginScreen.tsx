import { useEffect, useState } from 'react';
import { useWallet } from '../contexts/AuthContext';

interface LoginScreenProps {
  onSuccess: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { connect, isLoading, error, wallet } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (wallet && !isConnecting) {
      onSuccess();
    }
  }, [wallet, isConnecting, onSuccess]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect();
    } catch (err) {
      console.error('Failed to connect:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  if (wallet) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Nav */}
        <nav className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="material-symbols-outlined text-white text-lg">bolt</span>
            </div>
            <span className="text-xl font-bold text-white">MicoPay</span>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Hero Image / Illustration */}
          <div className="mb-8 relative">
            <div className="w-40 h-40 rounded-[2.5rem] bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
              <svg className="w-20 h-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center border-2 border-zinc-900">
              <span className="material-symbols-outlined text-emerald-400 text-lg">attach_money</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              MicoPay
            </h1>
            <p className="text-zinc-400">
              Convierte efectivo a crypto
            </p>
          </div>

          {/* Features - Cards */}
          <div className="w-full max-w-sm space-y-3 mb-8">
            <div className="flex items-center gap-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-400">security</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">Sin seed phrases</p>
                <p className="text-zinc-500 text-xs">Cuenta automáticamente</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-400">location_on</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">Agentes cercanos</p>
                <p className="text-zinc-500 text-xs">Depósita en tu barrio</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-400">savings</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">Zero fees</p>
                <p className="text-zinc-500 text-xs">No necesitas XLM</p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="w-full max-w-sm p-3 bg-red-900/20 border border-red-800 rounded-xl mb-4">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Button */}
          <button
            onClick={handleConnect}
            disabled={isLoading || isConnecting}
            className="w-full max-w-sm h-12 bg-white text-zinc-900 font-semibold rounded-full hover:bg-zinc-100 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading || isConnecting ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                Iniciando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </>
            )}
          </button>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center">
          <p className="text-zinc-600 text-xs">
           Powered by MicoPay · Stellar Network
          </p>
        </footer>
      </div>
    </div>
  );
}