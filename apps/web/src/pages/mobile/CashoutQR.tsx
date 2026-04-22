import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export interface CashRequestResponse {
  request_id: string;
  status: string;
  merchant: {
    name: string;
    address: string;
    stellar_address: string;
    tier: string;
  };
  exchange: {
    amount_mxn: number;
    amount_usdc: string;
    rate_usdc_mxn: number;
    htlc_tx_hash: string;
    htlc_explorer_url: string;
  };
  qr_payload: string;
  claim_url: string;
  instructions: string;
  expires_at: string;
}

interface CashoutQRProps {
    onBack: () => void;
    onSuccess: () => void;
    cashRequest: CashRequestResponse | null;
    polling?: boolean;
}

const EXPLORER = 'https://stellar.expert/explorer/testnet/tx';

const CashoutQR = ({ onBack, onSuccess, cashRequest, polling = false }: CashoutQRProps) => {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [timeLeft, setTimeLeft] = useState<number>(120);
    const [status, setStatus] = useState<'pending' | 'confirming' | 'completed'>('pending');

    useEffect(() => {
        if (!cashRequest?.qr_payload) return;

        const generateQR = async () => {
            try {
                const qrUrl = await QRCode.toDataURL(cashRequest.claim_url, {
                    width: 220,
                    margin: 2,
                    color: {
                        dark: '#00694C',
                        light: '#FFFFFF'
                    }
                });
                setQrDataUrl(qrUrl);
            } catch (err) {
                console.error('Failed to generate QR:', err);
            }
        };
        
        generateQR();
    }, [cashRequest]);

    useEffect(() => {
        if (!cashRequest?.expires_at) return;

        const interval = setInterval(() => {
            const left = Math.max(0, Math.floor((new Date(cashRequest.expires_at).getTime() - Date.now()) / 1000));
            setTimeLeft(left);
            
            if (left === 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [cashRequest?.expires_at]);

    useEffect(() => {
        if (!polling || !cashRequest?.request_id) return;

        const pollStatus = async () => {
            try {
                const res = await fetch(`/api/v1/cash/request/${cashRequest.request_id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'released' || data.status === 'completed') {
                        setStatus('completed');
                        setTimeout(onSuccess, 2000);
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        };

        const interval = setInterval(pollStatus, 5000);
        return () => clearInterval(interval);
    }, [polling, cashRequest?.request_id, onSuccess]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (!cashRequest) {
        return (
            <div className="bg-surface min-h-screen flex items-center justify-center">
                <p>Cargando...</p>
            </div>
        );
    }

    return (
        <div className="bg-surface text-on-surface min-h-screen flex flex-col">
            <header className="bg-[#F4FAFF] w-full top-0 sticky flex items-center justify-between px-6 py-4 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-[#00694C] active:scale-95 duration-200">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex flex-col">
                        <h1 className="font-headline font-bold text-xl text-[#0B1E26]">Retiro en efectivo</h1>
                        <span className="text-[10px] tracking-wide uppercase font-semibold text-primary">Código QR de transferencia</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-6 pt-4 pb-32 max-w-md mx-auto w-full space-y-6">
                <div className="bg-primary/10 rounded-xl p-4 flex items-center gap-3 border border-primary/20">
                    <div className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </div>
                    <p className="font-headline font-bold text-primary tracking-tight">Muestra este código al agente</p>
                </div>

                <div className="bg-surface-container-low rounded-[32px] p-8 flex flex-col items-center space-y-6 shadow-[0px_32px_32px_rgba(11,30,38,0.04)]">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-outline-variant/20">
                        {qrDataUrl ? (
                            <img 
                                alt="QR Code" 
                                className="w-48 h-48" 
                                src={qrDataUrl}
                            />
                        ) : (
                            <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-gray-400">qr_code</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="text-center space-y-2">
                        <p className="font-bold text-[11px] tracking-[0.15em] text-primary uppercase">Muestra este código al agente</p>
                        <div className="pt-4 space-y-1">
                            <h2 className="font-headline font-extrabold text-lg text-on-surface">{cashRequest?.merchant?.name || 'Agente'}</h2>
                            <p className="font-headline font-bold text-3xl text-primary">${cashRequest?.exchange?.amount_mxn || 0} MXN</p>
                            <p className="text-sm font-medium text-on-surface/60">={cashRequest?.exchange?.amount_usdc || '0'} USDC</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full">
                        <span className="material-symbols-outlined text-error text-sm">schedule</span>
                        <span className="text-sm font-medium text-on-surface">Expira en {formatTime(timeLeft)}</span>
                    </div>

                    <p className="text-xs text-on-surface-variant font-mono bg-surface-container-low px-3 py-1 rounded">
                        ID: {cashRequest.request_id}
                    </p>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-4 flex gap-4 items-start border border-surface-container-low shadow-sm">
                    <span className="material-symbols-outlined text-primary shrink-0">info</span>
                    <p className="text-[13px] leading-relaxed text-on-surface/80">
                        El agente escaneará este código para liberar tus USDC del contrato HTLC y te dará el efectivo en MXN.
                    </p>
                </div>

                {cashRequest?.exchange?.htlc_tx_hash && !cashRequest.exchange.htlc_tx_hash.startsWith('mock') && (
                    <a
                        href={`${EXPLORER}/${cashRequest.exchange.htlc_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-surface-container-low rounded-xl p-4 border border-primary/20 hover:bg-primary/5 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary">lock</span>
                            <div>
                                <p className="text-xs text-on-surface-variant uppercase">Fondos bloqueados en HTLC</p>
                                <p className="text-sm font-mono text-primary truncate">
                                    {cashRequest.exchange.htlc_tx_hash.substring(0, 20)}...
                                </p>
                            </div>
                            <span className="material-symbols-outlined text-primary ml-auto">open_in_new</span>
                        </div>
                    </a>
                )}

                <div className="text-center py-4">
                    <p className="text-sm text-on-surface-variant">
                        ¿Ya entregaste el efectivo? 
                        <button onClick={onSuccess} className="text-primary font-bold ml-1">Marcar como completado</button>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default CashoutQR;