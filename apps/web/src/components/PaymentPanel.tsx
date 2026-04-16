import { useState, useEffect } from "react";
import WalletConnect from "./WalletConnect";

interface Props {
  apiUrl: string;
}

interface RateInfo {
  pair: string;
  rate: number;
  source: string;
  age_seconds: number | null;
  timestamp: string;
}

export default function PaymentPanel({ apiUrl }: Props) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [rate, setRate] = useState<RateInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchRate();
  }, []);

  const fetchRate = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/cash/rate`);
      if (res.ok) {
        const data = await res.json();
        setRate(data);
      }
    } catch {
      // Ignore
    }
  };

  const handleConnect = (address: string) => {
    setWalletAddress(address);
    setPaymentStatus(null);
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setPaymentStatus(null);
  };

  const handleTestPayment = async () => {
    if (!walletAddress) return;
    setLoading(true);
    setPaymentStatus(null);

    try {
      const mockXdr = `mock:${walletAddress}:test`;

      const res = await fetch(`${apiUrl}/api/v1/cash/agents?lat=19.4195&lng=-99.1627&amount=500`, {
        headers: {
          "X-PAYMENT": mockXdr,
        },
      });

      if (res.ok) {
        setPaymentStatus("✅ Pago verificado correctamente");
      } else {
        const data = await res.json();
        setPaymentStatus(`❌ ${data.error || "Error en pago"}`);
      }
    } catch {
      setPaymentStatus("❌ Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "#4ade80" }}>
          👛 Wallet Connection
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Conecta tu wallet Stellar para realizar pagos x402 en la red MicoPay
        </p>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <WalletConnect
          apiUrl={apiUrl}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      </div>

      {walletAddress && (
        <>
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              background: "#1f2937",
              borderRadius: "8px",
              border: "1px solid #374151",
            }}
          >
            <h3 style={{ fontSize: "1rem", color: "#e5e7eb", marginBottom: "0.75rem" }}>
              💱 Tipo de Cambio Actual
            </h3>
            {rate ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#4ade80" }}>
                    1 USDC = {rate.rate.toFixed(4)} MXN
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    Fuente: {rate.source} · Actualizado hace {rate.age_seconds}s
                  </div>
                </div>
                <button
                  onClick={fetchRate}
                  style={{
                    padding: "0.5rem",
                    background: "transparent",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    color: "#9ca3af",
                    cursor: "pointer",
                  }}
                >
                  🔄
                </button>
              </div>
            ) : (
              <div style={{ color: "#6b7280" }}>Cargando...</div>
            )}
          </div>

          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              background: "#1f2937",
              borderRadius: "8px",
              border: "1px solid #374151",
            }}
          >
            <h3 style={{ fontSize: "1rem", color: "#e5e7eb", marginBottom: "0.75rem" }}>
              🧪 Probar Pago x402
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#9ca3af", marginBottom: "1rem" }}>
              Simula un pago x402 usando tu wallet conectada
            </p>

            <button
              onClick={handleTestPayment}
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.875rem",
                background: loading ? "#374151" : "#4ade80",
                border: "none",
                borderRadius: "8px",
                color: loading ? "#9ca3af" : "#052e16",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
              }}
            >
              {loading ? "⏳ Verificando..." : "🧪 Simular Pago"}
            </button>

            {paymentStatus && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem",
                  background: paymentStatus.startsWith("✅") ? "#14532d" : "#7f1d1d",
                  borderRadius: "6px",
                  color: paymentStatus.startsWith("✅") ? "#bbf7d0" : "#fecaca",
                  fontSize: "0.875rem",
                }}
              >
                {paymentStatus}
              </div>
            )}
          </div>

          <div
            style={{
              padding: "1rem",
              background: "#1f2937",
              borderRadius: "8px",
              border: "1px solid #374151",
            }}
          >
            <h3 style={{ fontSize: "1rem", color: "#e5e7eb", marginBottom: "0.75rem" }}>
              📋 Cómo funciona x402
            </h3>
            <ol
              style={{
                paddingLeft: "1.25rem",
                fontSize: "0.875rem",
                color: "#9ca3af",
                lineHeight: 2,
              }}
            >
              <li>Conecta tu wallet (Freighter o Albedo)</li>
              <li>Los endpoints x402 requieren pago en USDC</li>
              <li>Firma una transacción de pago con tu wallet</li>
              <li>Incluye el XDR firmado en el header X-PAYMENT</li>
              <li>El servidor verifica el pago automáticamente</li>
            </ol>
          </div>
        </>
      )}

      {!walletAddress && (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            background: "#1f2937",
            borderRadius: "8px",
            border: "1px dashed #374151",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔐</div>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            Conecta tu wallet para ver las opciones de pago
          </p>
        </div>
      )}
    </div>
  );
}
