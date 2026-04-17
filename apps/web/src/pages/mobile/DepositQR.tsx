import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface DepositQRProps {
    onBack: () => void;
    onChat: () => void;
    onSuccess: () => void;
    amountMxn?: number;
    agentName?: string;
    agentAddress?: string;
}

interface QRPayload {
    type: 'micopay_deposit';
    amount: number;
    currency: 'MXN';
    userId: string;
    timestamp: number;
    depositId: string;
}

const DepositQR = ({ 
    onBack, 
    onChat, 
    onSuccess, 
    amountMxn = 500, 
    agentName = 'Tienda Don Pepe',
    agentAddress = 'Av. Álvaro Obregón 120, Roma Norte, CDMX'
}: DepositQRProps) => {
    const [pin, setPin] = useState<string>('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [depositId] = useState<string>(`DEP-${Date.now().toString(36).toUpperCase()}`);

    useEffect(() => {
        const generateQR = async () => {
            const payload: QRPayload = {
                type: 'micopay_deposit',
                amount: amountMxn,
                currency: 'MXN',
                userId: 'user_demo',
                timestamp: Date.now(),
                depositId: depositId
            };
            
            try {
                const qrUrl = await QRCode.toDataURL(JSON.stringify(payload), {
                    width: 200,
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
    }, [amountMxn, depositId]);

    const handlePinClick = (num: string) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                setIsConfirming(true);
                setTimeout(() => {
                    onSuccess();
                }, 2000);
            }
        }
    };

    const handleBackspace = () => {
        setPin(pin.slice(0, -1));
    };

    const handleReset = () => {
        setPin('');
        setIsConfirming(false);
    };

    return (
        <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
            {/* TopAppBar */}
            <header className="bg-[#F4FAFF] w-full top-0 sticky flex items-center justify-between px-6 py-4 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-[#00694C] active:scale-95 duration-200">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                            <h1 className="font-headline font-bold text-xl text-[#0B1E26]">{agentName}</h1>
                            <span className="material-symbols-outlined text-[#00694C] text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>verified</span>
                        </div>
                        <span className="text-[10px] tracking-wide uppercase font-semibold text-primary">Agente Autorizado</span>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden">
                    <img 
                        alt="User Profile" 
                        className="w-full h-full object-cover" 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKtGmlK9lRTQqDgKWWxCpzzjhH6AVdcuHK_OmrECeSWTtfYZXttDqAXUbcUt3N7mNRgIrdDC-rzkm7QhL5aHJEIj66NQsWFL7blIxtsKfz7sW8xoE84bcZwZQKFjTbC0ctzIeMHkkVA4Poc4OAKPNmnJMNi0CmKIcJewWKQ04I4ZRF0NALv8PTBEcuApZVwafge5pjDjodq-9720hX1TTnUKImWXRphyYvkmvVuw_UtZQWopSZJmJAU7v5slxmO6QXYEgh_F5WKn2v" 
                    />
                </div>
            </header>

            <main className="flex-1 px-6 pt-4 pb-32 max-w-md mx-auto w-full space-y-6">
                {/* Status Banner */}
                <div className="bg-primary/10 rounded-xl p-4 flex items-center gap-3 border border-primary/20">
                    <div className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </div>
                    <p className="font-headline font-bold text-primary tracking-tight">Esperando encuentro</p>
                </div>

                {/* Chat Preview */}
                <section>
                    <div className="bg-surface-container-lowest border border-surface-container-low p-4 rounded-2xl shadow-sm">
                        <div className="flex gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-surface-container-high flex-shrink-0 flex items-center justify-center overflow-hidden">
                                <img 
                                    alt="Tienda Don Pepe Storefront" 
                                    className="w-full h-full object-cover" 
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdc2bgOszS_GKqShcTimO9xO4li98JYZSAM4J3KUtr7ijh1lTKkR5cnkCMKc7uRs8byC-L448t0UzSmCUqUw6O0VLxfByjMAPP2kke6OMAIpP5OjjibElzXxTD2RDaQY4dGSpUFVW_QsKBoNFIEuFfUBwpm2E_UyBumuFY-bAqxUJm7qV0lrGnPncQVbTVDhHVdTiXjwIEifagwUVn0mdIlcEAaa_teXFSFlQ2m9v0sl035tRphrFRbUDk4K4xjlEBqPNHWTlVdmUs" 
                                />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-on-surface-variant leading-snug">
                                    <span className="font-bold text-on-surface">{agentName}:</span> Hola Juan, ya recibí tu solicitud. Te comparto la ubicación, {agentAddress}.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={onChat}
                                className="flex-1 py-2 px-4 rounded-lg border border-primary text-primary font-bold text-xs hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">chat</span>
                                Abrir chat
                            </button>
                            <button className="flex-1 py-2 px-4 rounded-lg border border-primary text-primary font-bold text-xs hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">location_on</span>
                                Compartir ubicación
                            </button>
                        </div>
                    </div>
                </section>

                {/* QR Content Card */}
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
                        <p className="font-bold text-[11px] tracking-[0.15em] text-primary uppercase">MUESTRA ESTE CÓDIGO AL AGENTE</p>
                        <div className="pt-4 space-y-1">
                            <h2 className="font-headline font-extrabold text-lg text-on-surface">Juan Pérez · @juanp</h2>
                            <p className="font-headline font-bold text-3xl text-primary">${amountMxn} MXN <span className="text-sm font-medium text-on-surface/60">a depositar</span></p>
                        </div>
                    </div>
                    <p className="text-xs text-on-surface-variant font-mono bg-surface-container-low px-3 py-1 rounded">
                        ID: {depositId}
                    </p>
                </div>

                {/* Info */}
                <div className="bg-surface-container-lowest rounded-2xl p-4 flex gap-4 items-start border border-surface-container-low shadow-sm">
                    <span className="material-symbols-outlined text-primary shrink-0">info</span>
                    <p className="text-[13px] leading-relaxed text-on-surface/80">
                        El agente acreditará el saldo a tu wallet después de recibir el efectivo y escanear este código.
                    </p>
                </div>

                {/* PIN Input Section */}
                <div className="space-y-4 pt-4 text-center">
                    <p className="font-semibold text-sm text-on-surface/60 uppercase tracking-widest mb-6">Confirma con tu PIN</p>
                    <div className="flex justify-center gap-6 mb-10">
                        {[0, 1, 2, 3].map((i) => (
                            <div 
                                key={i}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                    pin.length > i ? 'bg-primary scale-125 shadow-[0_0_12px_rgba(0,105,76,0.3)]' : 'bg-outline-variant/30'
                                }`}
                            />
                        ))}
                    </div>

                    {!isConfirming ? (
                        <div className="grid grid-cols-3 gap-y-4 gap-x-8 max-w-[280px] mx-auto pb-10">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
                                <button
                                    key={key}
                                    onClick={() => {
                                        if (key === 'del') {
                                            handleBackspace();
                                        } else if (key !== '') {
                                            handlePinClick(key);
                                        }
                                    }}
                                    disabled={key === ''}
                                    className={`
                                        h-14 rounded-xl text-xl font-bold transition-all active:scale-95
                                        ${key === '' ? 'invisible' : ''}
                                        ${key === 'del' ? 'text-error bg-error/10' : 'bg-surface-container-low text-on-surface'}
                                        ${key !== '' && key !== 'del' ? 'hover:bg-primary/10' : ''}
                                        disabled:opacity-0
                                    `}
                                >
                                    {key === 'del' ? (
                                        <span className="material-symbols-outlined">backspace</span>
                                    ) : key}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-primary text-4xl animate-spin">sync</span>
                            </div>
                            <p className="font-bold text-primary">Confirmando depósito...</p>
                            <p className="text-sm text-on-surface-variant mt-2">Espera mientras procesamos tu transacción</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default DepositQR;