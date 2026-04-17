import { useState } from 'react';
import { useWallet } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

interface LoginScreenProps {
  onSuccess: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { connect, isLoading, error, wallet } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect();
      if (wallet) {
        onSuccess();
      }
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
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-12">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-xl shadow-primary/20 mb-6 mx-auto">
            <svg fill="none" height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="7" r="3" stroke="white" strokeWidth="2"/>
              <circle cx="17" cy="17" r="3" stroke="white" strokeWidth="2"/>
              <path d="M10 10L14 14" stroke="white" strokeLinecap="round" strokeWidth="2"/>
            </svg>
          </div>
          <h1 className="text-4xl font-headline font-extrabold text-center text-on-surface">
            MicoPay
          </h1>
          <p className="text-center text-on-surface-variant mt-2">
            Convierte efectivo a crypto en minutos
          </p>
        </div>

        {/* Features */}
        <div className="w-full max-w-sm space-y-4 mb-12">
          <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-xl">bolt</span>
            </div>
            <div>
              <p className="font-bold text-on-surface">Sin seed phrases</p>
              <p className="text-sm text-on-surface-variant">Ingresa con Google o email</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-xl">location_on</span>
            </div>
            <div>
              <p className="font-bold text-on-surface">Agentes cercanos</p>
              <p className="text-sm text-on-surface-variant">Encuentra puntos de intercambio</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-xl">payments</span>
            </div>
            <div>
              <p className="font-bold text-on-surface">Zero gas fees</p>
              <p className="text-sm text-on-surface-variant">Empieza sinnecesitar XLM</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full max-w-sm mb-6 p-4 bg-error/10 border border-error/20 rounded-xl">
            <p className="text-sm text-error text-center">{error}</p>
          </div>
        )}

        {/* CTA */}
        <div className="w-full max-w-sm space-y-4">
          <Button
            onClick={handleConnect}
            isLoading={isLoading || isConnecting}
            className="w-full h-14 text-lg"
          >
            {isLoading || isConnecting ? 'Conectando...' : 'Conectar wallet'}
          </Button>

          <p className="text-center text-xs text-on-surface-variant">
            Al continuar, aceptas nuestros{' '}
            <a href="#" className="text-primary underline">Términos de servicio</a>
            {' '}y{' '}
            <a href="#" className="text-primary underline">Política de privacidad</a>
          </p>
        </div>
      </div>

      {/* Powered by */}
      <div className="p-6 text-center">
        <p className="text-xs text-on-surface-variant">
          Desarrollado con{' '}
          <a href="https://accesly.vercel.app" target="_blank" rel="noopener noreferrer" className="text-primary font-medium">
            Accesly
          </a>
          {' '}· Construido en Stellar
        </p>
      </div>
    </div>
  );
}
