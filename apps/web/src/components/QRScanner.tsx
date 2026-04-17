import { useState, useEffect, useRef } from 'react';

interface QRScannerProps {
    onScan: (data: QRPayload) => void;
    onError?: (error: string) => void;
}

interface QRPayload {
    type: 'micopay_deposit';
    amount: number;
    currency: 'MXN';
    userId: string;
    timestamp: number;
    depositId: string;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
    const [scanning, setScanning] = useState(false);
    const [manualInput, setManualInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<number | null>(null);

    const startCamera = async () => {
        try {
            setCameraError(false);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setScanning(true);
                
                // Start scanning loop
                scanIntervalRef.current = window.setInterval(() => {
                    scanQRFrame();
                }, 500);
            }
        } catch (err) {
            console.error('Camera error:', err);
            setCameraError(true);
            setError('No se pudo acceder a la cámara');
            onError?.('Camera access denied');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        setScanning(false);
    };

    const scanQRFrame = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        // Note: For actual QR scanning, we'd need a library like jsQR
        // For demo, we'll use manual input
    };

    const handleManualSubmit = () => {
        try {
            const data = JSON.parse(manualInput);
            if (data.type === 'micopay_deposit' && data.amount && data.depositId) {
                onScan(data);
            } else {
                setError('Código QR inválido');
            }
        } catch {
            setError('Formato inválido. Intenta de nuevo.');
        }
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    return (
        <div className="bg-surface font-body min-h-screen flex flex-col">
            <header className="bg-[#00694C] text-white px-6 py-4 flex items-center gap-4">
                <button onClick={() => window.history.back()} className="text-white">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="font-bold text-xl">Escanear Código QR</h1>
            </header>

            <main className="flex-1 p-6 space-y-6">
                {cameraError ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                        <span className="material-symbols-outlined text-yellow-600 text-4xl mb-2">videocam_off</span>
                        <p className="text-yellow-800 font-medium">Cámara no disponible</p>
                        <p className="text-yellow-600 text-sm mt-1">Usa el método manual</p>
                    </div>
                ) : (
                    <div className="bg-black rounded-2xl overflow-hidden aspect-square relative">
                        <video 
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            playsInline
                            muted
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {/* Scanning overlay */}
                        {scanning && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-64 h-64 border-2 border-white rounded-lg animate-pulse" />
                            </div>
                        )}
                        
                        {!scanning && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <button 
                                    onClick={startCamera}
                                    className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">qr_code_scanner</span>
                                    Iniciar escáner
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Input */}
                <div className="space-y-4">
                    <p className="text-center text-on-surface-variant text-sm">
                        O ingresa el código manualmente:
                    </p>
                    
                    <textarea
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder='{"type":"micopay_deposit","amount":500,"currency":"MXN","depositId":"DEP-XXX"}'
                        className="w-full h-32 bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 text-sm font-mono"
                    />
                    
                    {error && (
                        <p className="text-error text-sm text-center">{error}</p>
                    )}
                    
                    <button 
                        onClick={handleManualSubmit}
                        disabled={!manualInput.trim()}
                        className="w-full bg-primary text-white font-bold py-4 rounded-xl disabled:opacity-50"
                    >
                        Confirmar Depósito
                    </button>
                </div>

                {/* Instructions */}
                <div className="bg-surface-container-low rounded-xl p-4 space-y-2">
                    <p className="font-bold text-sm">Cómo usar:</p>
                    <ol className="text-sm text-on-surface-variant space-y-1 list-decimal list-inside">
                        <li>Pide al usuario que muestre su código QR</li>
                        <li>Escanea o ingresa el código manualmente</li>
                        <li>Verifica la cantidad a depositar</li>
                        <li>Recibe el efectivo y confirma</li>
                    </ol>
                </div>
            </main>
        </div>
    );
}

export default QRScanner;