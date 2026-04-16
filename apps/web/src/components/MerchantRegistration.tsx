import { useState } from "react";

interface MerchantRegistration {
  stellar_address: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  max_trade_mxn: number;
  min_trade_mxn: number;
}

interface Props {
  apiUrl: string;
}

const MERCHANT_TYPES = [
  { value: "farmacia", label: "🏥 Farmacia" },
  { value: "tienda", label: "🛒 Tienda" },
  { value: "papeleria", label: "📚 Papelería" },
  { value: "consultorio", label: "👨‍⚕️ Consultorio" },
  { value: "abarrotes", label: "🏪 Abarrotes" },
  { value: "otro", label: "📍 Otro" },
];

export default function MerchantRegistration({ apiUrl }: Props) {
  const [form, setForm] = useState<Partial<MerchantRegistration>>({
    type: "tienda",
    min_trade_mxn: 100,
    max_trade_mxn: 3000,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(`${apiUrl}/api/v1/merchants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(`✅ Merchant registrado: ${data.id}`);
        setForm({
          type: "tienda",
          min_trade_mxn: 100,
          max_trade_mxn: 3000,
        });
      } else {
        setStatus("error");
        setMessage(`❌ Error: ${data.error || data.message}`);
      }
    } catch {
      setStatus("error");
      setMessage("❌ Error de conexión");
    }
  };

  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm((f) => ({
            ...f,
            lat: parseFloat(position.coords.latitude.toFixed(6)),
            lng: parseFloat(position.coords.longitude.toFixed(6)),
          }));
          setUseCurrentLocation(true);
        },
        () => {
          setMessage("⚠️ No se pudo obtener ubicación");
        }
      );
    }
  };

  const isValid =
    form.stellar_address?.match(/^G[A-Z2-7]{55}$/) &&
    form.name &&
    form.address &&
    form.lat &&
    form.lng &&
    form.min_trade_mxn! > 0 &&
    form.max_trade_mxn! >= form.min_trade_mxn!;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "#4ade80" }}>
          📍 Registro de Merchant
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Registra tu negocio en la red P2P de MicoPay para recibir efectivo físico a cambio de USDC.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={labelStyle}>Dirección Stellar *</label>
          <input
            type="text"
            value={form.stellar_address || ""}
            onChange={(e) => setForm((f) => ({ ...f, stellar_address: e.target.value }))}
            placeholder="G..."
            style={inputStyle}
            required
          />
          <small style={{ color: "#6b7280", fontSize: "0.75rem" }}>
            Tu clave pública en Stellar (ej: Freighter, Albedo)
          </small>
        </div>

        <div>
          <label style={labelStyle}>Nombre del negocio *</label>
          <input
            type="text"
            value={form.name || ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Farmacia Guadalupe"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Tipo de negocio *</label>
          <select
            value={form.type || "tienda"}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            style={inputStyle}
          >
            {MERCHANT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Dirección física *</label>
          <input
            type="text"
            value={form.address || ""}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Av. Principal #123, Col. Centro, CDMX"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Ubicación (lat, lng) *</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="number"
              step="0.000001"
              value={form.lat || ""}
              onChange={(e) => setForm((f) => ({ ...f, lat: parseFloat(e.target.value) }))}
              placeholder="19.4195"
              style={{ ...inputStyle, flex: 1 }}
              required
            />
            <input
              type="number"
              step="0.000001"
              value={form.lng || ""}
              onChange={(e) => setForm((f) => ({ ...f, lng: parseFloat(e.target.value) }))}
              placeholder="-99.1627"
              style={{ ...inputStyle, flex: 1 }}
              required
            />
            <button
              type="button"
              onClick={handleGetLocation}
              style={{
                padding: "0.5rem 1rem",
                background: "#7c3aed",
                border: "none",
                borderRadius: "6px",
                color: "white",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              📍 GPS
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Mínimo por operación (MXN) *</label>
            <input
              type="number"
              min="50"
              value={form.min_trade_mxn || ""}
              onChange={(e) => setForm((f) => ({ ...f, min_trade_mxn: parseInt(e.target.value) }))}
              style={inputStyle}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Máximo por operación (MXN) *</label>
            <input
              type="number"
              min="50"
              value={form.max_trade_mxn || ""}
              onChange={(e) => setForm((f) => ({ ...f, max_trade_mxn: parseInt(e.target.value) }))}
              style={inputStyle}
              required
            />
          </div>
        </div>

        {message && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "6px",
              background: status === "error" ? "#7f1d1d" : "#14532d",
              color: status === "error" ? "#fecaca" : "#bbf7d0",
              fontSize: "0.875rem",
            }}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || status === "loading"}
          style={{
            padding: "0.875rem",
            background: isValid && status !== "loading" ? "#4ade80" : "#374151",
            border: "none",
            borderRadius: "8px",
            color: isValid && status !== "loading" ? "#052e16" : "#6b7280",
            fontWeight: "bold",
            cursor: isValid && status !== "loading" ? "pointer" : "not-allowed",
            fontSize: "1rem",
            marginTop: "0.5rem",
          }}
        >
          {status === "loading" ? "⏳ Registrando..." : "🍄 Registrar Merchant"}
        </button>
      </form>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#1f2937",
          borderRadius: "8px",
          fontSize: "0.875rem",
          color: "#9ca3af",
        }}
      >
        <h3 style={{ color: "#e5e7eb", marginBottom: "0.5rem" }}>💡 ¿Cómo funciona?</h3>
        <ol style={{ paddingLeft: "1.25rem", lineHeight: 1.8 }}>
          <li>Registra tu negocio con tu dirección Stellar</li>
          <li>Los usuarios buscan merchants cercanos usando la app</li>
          <li>Reciben una solicitud de efectivo con pago en USDC</li>
          <li>Entregas el efectivo y el USDC llega a tu wallet automáticamente</li>
        </ol>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "0.375rem",
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "#d1d5db",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "6px",
  color: "#f3f4f6",
  fontSize: "0.875rem",
};
