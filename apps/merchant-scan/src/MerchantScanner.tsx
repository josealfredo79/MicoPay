import { useState, useCallback, useRef, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface ScanResult {
  status: string;
  request_id: string;
  merchant_name: string;
  amount_mxn: number;
  release_tx_hash?: string;
  error?: string;
}

function MerchantScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  const parseQR = useCallback((text: string): { request_id: string; merchant?: string } | null => {
    try {
      if (text.startsWith('micopay://claim?')) {
        const params = new URLSearchParams(text.replace('micopay://claim?', ''));
        return {
          request_id: params.get('request_id') ?? '',
          merchant: params.get('merchant') ?? undefined,
        };
      }
      const json = JSON.parse(text);
      return { request_id: json.request_id, merchant: json.merchant };
    } catch {
      return null;
    }
  }, []);

  const startScan = useCallback(async () => {
    if (!videoRef.current) return;
    setScanning(true);
    setResult(null);
    setError(null);

    scannerRef.current = new Html5Qrcode(videoRef.current.id);

    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const parsed = parseQR(decodedText);
          if (parsed?.request_id) {
            stopScan();
            handleRequestId(parsed.request_id);
          }
        },
        () => {}
      );
    } catch (err) {
      setError('Camera not available. Please allow camera access.');
      setScanning(false);
    }
  }, [parseQR]);

  const stopScan = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleRequestId = useCallback(async (requestId: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/cash/request/${requestId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Solicitud no encontrada. ¿Es el QR correcto?');
        } else {
          setError('Error del servidor. Intenta de nuevo.');
        }
        return;
      }
      const data = await res.json();
      setResult({
        status: data.status,
        request_id: data.request_id,
        merchant_name: data.merchant_name,
        amount_mxn: data.amount_mxn,
      });
    } catch {
      setError('No se pudo conectar al servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmCash = useCallback(async (requestId: string) => {
    setLoading(true);
    setError(null);

    const stellarAddress = (document.getElementById('merchant-address') as HTMLInputElement)?.value;
    if (!stellarAddress) {
      setError('Ingresa tu dirección Stellar');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/cash/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, merchant_stellar_address: stellarAddress }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al liberar fondos');
        return;
      }
      setResult({
        status: 'completed',
        request_id: requestId,
        merchant_name: result?.merchant_name ?? '',
        amount_mxn: result?.amount_mxn ?? 0,
        release_tx_hash: data.release_tx_hash,
      });
    } catch {
      setError('No se pudo conectar al servidor.');
    } finally {
      setLoading(false);
    }
  }, [result]);

  useEffect(() => {
    return () => { stopScan(); };
  }, [stopScan]);

  return (
    <div style={{ minHeight: '100vh', background: '#f4faff', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 24 }}>🍄</span>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>MicoPay Commerce</h1>
            <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Panel del comerciante</p>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
            Tu dirección Stellar
          </label>
          <input
            id="merchant-address"
            type="text"
            placeholder="GXXXXXXXX..."
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 12,
              border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box',
            }}
          />
        </div>

        {result ? (
          <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: result.status === 'completed' ? '#22c55e20' : '#f59e0b20',
              borderRadius: 999, padding: '6px 14px', marginBottom: 16,
            }}>
              <span>{result.status === 'completed' ? '✅' : '⏳'}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {result.status === 'completed' ? 'Completado' : 'Listo para confirmar'}
              </span>
            </div>

            <p style={{ fontWeight: 800, fontSize: 32, margin: '0 0 4px' }}>
              ${result.amount_mxn} <span style={{ fontSize: 16, fontWeight: 400, color: '#888' }}>MXN</span>
            </p>
            <p style={{ color: '#555', fontSize: 14, margin: '0 0 16px' }}>{result.merchant_name}</p>

            {result.status !== 'completed' && (
              <button
                onClick={() => confirmCash(result.request_id)}
                disabled={loading}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14,
                  background: loading ? '#ccc' : '#1a1a2e',
                  color: 'white', fontSize: 16, fontWeight: 700,
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Confirmando...' : 'Confirmar y liberar USDC'}
              </button>
            )}

            {result.release_tx_hash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${result.release_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', marginTop: 12, color: '#1976d2', fontSize: 12 }}
              >
                Ver transacción on-chain →
              </a>
            )}

            <button
              onClick={() => setResult(null)}
              style={{
                marginTop: 12, background: 'none', border: 'none',
                color: '#888', fontSize: 13, cursor: 'pointer',
              }}
            >
              Escanear otro QR
            </button>
          </div>
        ) : error ? (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 16, padding: 20, textAlign: 'center',
          }}>
            <p style={{ color: '#dc2626', fontWeight: 600, margin: '0 0 12px' }}>❌ {error}</p>
            <button onClick={() => setError(null)} style={{
              background: 'none', border: '1px solid #ddd', borderRadius: 10,
              padding: '10px 20px', cursor: 'pointer',
            }}>
              Intentar de nuevo
            </button>
          </div>
        ) : (
          <div style={{
            background: 'white', borderRadius: 20, padding: 24,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center',
          }}>
            <div
              id="scanner-region"
              ref={videoRef}
              style={{ width: '100%', maxWidth: 300, margin: '0 auto 16px', borderRadius: 12 }}
            />

            {scanning ? (
              <button onClick={stopScan} style={{
                width: '100%', padding: '14px', borderRadius: 12,
                background: '#ef4444', color: 'white', fontWeight: 700,
                border: 'none', cursor: 'pointer',
              }}>
                Detener cámara
              </button>
            ) : (
              <button onClick={startScan} disabled={loading} style={{
                width: '100%', padding: '14px', borderRadius: 12,
                background: '#1a1a2e', color: 'white', fontWeight: 700,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                📷 Escanear QR
              </button>
            )}

            <p style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
              Apunta la cámara al código QR del cliente
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MerchantScanner;