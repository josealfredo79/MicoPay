import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { AcceslyProvider, useAccesly, type WalletInfo } from 'accesly';

const ACCESLY_API_KEY = import.meta.env.VITE_ACCESLY_API_KEY ?? 'acc_ec31dd100849c18b347cbc2e';

interface AuthContextType {
  wallet: WalletInfo | null;
  balance: string | null;
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

function AuthConsumer() {
  const accesly = useAccesly();
  const [authState, setAuthState] = useState<AuthContextType>({
    wallet: null,
    balance: null,
    isLoading: true,
    isCreating: false,
    error: null,
    connect: async () => {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        await accesly.connect();
      } catch (err) {
        setAuthState(prev => ({ ...prev, error: String(err), isLoading: false }));
      }
    },
    disconnect: () => {
      accesly.disconnect();
    },
  });

  useEffect(() => {
    setAuthState(prev => ({
      ...prev,
      wallet: accesly.wallet,
      balance: accesly.balance,
      isLoading: accesly.loading || accesly.creating,
      isCreating: accesly.creating,
      error: accesly.error,
    }));
  }, [accesly.wallet, accesly.balance, accesly.loading, accesly.creating, accesly.error]);

  return (
    <AuthContext.Provider value={authState}>
      {null}
    </AuthContext.Provider>
  );
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <AcceslyProvider
      appId={ACCESLY_API_KEY}
      network="testnet"
      theme="light"
    >
      <AuthConsumer />
      {children}
    </AcceslyProvider>
  );
}

export function useWallet() {
  const { wallet, balance, loading, creating, error, connect, disconnect } = useAccesly();
  return {
    wallet,
    balance,
    isLoading: loading || creating,
    error,
    publicKey: wallet?.publicKey ?? null,
    stellarAddress: wallet?.stellarAddress ?? null,
    connect,
    disconnect,
    formatAddress: (address: string) => {
      if (!address) return '';
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    },
  };
}
