import { useContext, type React } from 'react';
import { AcceslyProvider, useAccesly, type WalletInfo } from 'accesly';

const ACCESLY_API_KEY = import.meta.env.VITE_ACCESLY_API_KEY ?? 'acc_ec31dd100849c18b347cbc2e';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AcceslyProvider
      appId={ACCESLY_API_KEY}
      network="testnet"
      theme="dark"
    >
      {children}
    </AcceslyProvider>
  );
}

export function useWallet() {
  const wallet = useAccesly();
  return {
    wallet: wallet.wallet,
    balance: wallet.balance,
    isLoading: wallet.loading || wallet.creating,
    error: wallet.error,
    publicKey: wallet.wallet?.publicKey ?? null,
    stellarAddress: wallet.wallet?.stellarAddress ?? null,
    connect: wallet.connect,
    disconnect: wallet.disconnect,
    formatAddress: (address: string) => {
      if (!address) return '';
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    },
  };
}
