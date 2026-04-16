import { useState, useEffect } from "react";

type WalletType = "freighter" | "albedo" | null;

interface WalletState {
  connected: boolean;
  address: string | null;
  type: WalletType;
  error: string | null;
}

interface Props {
  apiUrl: string;
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

declare global {
  interface Window {
    freighterApi?: {
      isConnected: () => Promise<boolean>;
      getAddress: () => Promise<{ address: string }>;
      signTransaction: (tx: string, options?: object) => Promise<string>;
    };
    albedo?: {
      isConnected: () => Promise<boolean>;
      getAddress: () => Promise<{ address: string }>;
      signTransaction: (tx: string, options?: object) => Promise<string>;
    };
  }
}

export default function WalletConnect({ apiUrl, onConnect, onDisconnect }: Props) {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    type: null,
    error: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkWallets();
  }, []);

  const checkWallets = async () => {
    const hasFreighter = typeof window !== "undefined" && !!window.freighterApi;
    const hasAlbedo = typeof window !== "undefined" && !!window.albedo;

    if (hasFreighter) {
      try {
        const connected = await window.freighterApi!.isConnected();
        if (connected) {
          const { address } = await window.freighterApi!.getAddress();
          setState({ connected: true, address, type: "freighter", error: null });
          onConnect?.(address);
        }
      } catch {
        // Freighter not connected
      }
    }

    if (hasAlbedo && !state.connected) {
      try {
        const connected = await window.albedo!.isConnected();
        if (connected) {
          const { address } = await window.albedo!.getAddress();
          setState({ connected: true, address, type: "albedo", error: null });
          onConnect?.(address);
        }
      } catch {
        // Albedo not connected
      }
    }
  };

  const connectFreighter = async () => {
    setLoading(true);
    setState((s) => ({ ...s, error: null }));

    try {
      if (!window.freighterApi) {
        throw new Error("Freighter no instalado. Instálalo desde chrome web store.");
      }

      const isConnected = await window.freighterApi.isConnected();
      if (!isConnected) {
        throw new Error("Por favor conecta Freighter primero");
      }

      const { address } = await window.freighterApi.getAddress();
      setState({ connected: true, address, type: "freighter", error: null });
      onConnect?.(address);
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Error conectando Freighter",
      }));
    } finally {
      setLoading(false);
    }
  };

  const connectAlbedo = async () => {
    setLoading(true);
    setState((s) => ({ ...s, error: null }));

    try {
      if (!window.albedo) {
        throw new Error("Albedo no instalado.");
      }

      const { address } = await window.albedo.getAddress();
      setState({ connected: true, address, type: "albedo", error: null });
      onConnect?.(address);
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Error conectando Albedo",
      }));
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setState({ connected: false, address: null, type: null, error: null });
    onDisconnect?.();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (state.connected && state.address) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          background: "#1f2937",
          borderRadius: "8px",
          border: "1px solid #374151",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: state.type === "freighter" ? "#4ade80" : "#f59e0b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: "bold",
            color: "#052e16",
          }}
        >
          {state.type === "freighter" ? "F" : "A"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#f3f4f6" }}>
            {state.type === "freighter" ? "Freighter" : "Albedo"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#9ca3af",
              fontFamily: "monospace",
            }}
          >
            {formatAddress(state.address)}
          </div>
        </div>
        <button
          onClick={disconnect}
          style={{
            padding: "0.375rem 0.75rem",
            background: "transparent",
            border: "1px solid #6b7280",
            borderRadius: "6px",
            color: "#9ca3af",
            fontSize: "0.75rem",
            cursor: "pointer",
          }}
        >
          Desconectar
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "1rem",
        background: "#1f2937",
        borderRadius: "8px",
        border: "1px solid #374151",
      }}
    >
      <div style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "0.25rem" }}>
        Conecta tu wallet para realizar pagos x402
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={connectFreighter}
          disabled={loading}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.75rem",
            background: loading ? "#374151" : "#052e16",
            border: "1px solid #4ade80",
            borderRadius: "8px",
            color: "#4ade80",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <span style={{ fontSize: "1.25rem" }}>🦆</span>
          {loading ? "Conectando..." : "Freighter"}
        </button>

        <button
          onClick={connectAlbedo}
          disabled={loading}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.75rem",
            background: loading ? "#374151" : "#1c1917",
            border: "1px solid #f59e0b",
            borderRadius: "8px",
            color: "#f59e0b",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <span style={{ fontSize: "1.25rem" }}>☀️</span>
          {loading ? "Conectando..." : "Albedo"}
        </button>
      </div>

      {state.error && (
        <div
          style={{
            padding: "0.5rem 0.75rem",
            background: "#7f1d1d",
            borderRadius: "6px",
            color: "#fecaca",
            fontSize: "0.75rem",
          }}
        >
          {state.error}
        </div>
      )}

      <div style={{ fontSize: "0.7rem", color: "#6b7280", textAlign: "center" }}>
        Instala Freighter desde{" "}
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#a78bfa" }}
        >
          freighter.app
        </a>{" "}
        o usa Albedo
      </div>
    </div>
  );
}
