import { useState, useEffect } from 'react';
import MapSim from '../components/MapSim';

interface Agent {
  id: string;
  stellar_address: string;
  name: string;
  type: string;
  address: string;
  distance_km: number;
  available_mxn: number;
  max_trade_mxn: number;
  tier: string;
  reputation: number;
  completion_rate: number;
  trades_completed: number;
  online: boolean;
  usdc_rate: number;
  amount_usdc_needed: number;
}

interface DepositMapProps {
    onBack: () => void;
    onSelectOffer: (offerId: string) => void;
    loading?: boolean;
    amountMxn?: number;
    userLat?: number;
    userLng?: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const DepositMap = ({ onBack, onSelectOffer, loading, amountMxn = 500, userLat = 19.4195, userLng = -99.1627 }: DepositMapProps) => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loadingAgents, setLoadingAgents] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [usdcRate, setUsdcRate] = useState(17.26);

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                setLoadingAgents(true);
                const res = await fetch(`${API_URL}/api/v1/cash/agents?lat=${userLat}&lng=${userLng}&amount=${amountMxn}&limit=10`, {
                    headers: { 'x-payment': 'demo' }
                });
                const data = await res.json();
                if (data.agents) {
                    setAgents(data.agents);
                    setUsdcRate(data.usdc_mxn_rate || 17.26);
                }
            } catch (err) {
                console.error('Failed to fetch agents:', err);
                setError('No se pudieron cargar los agentes');
            } finally {
                setLoadingAgents(false);
            }
        };
        fetchAgents();
    }, [amountMxn, userLat, userLng]);

    const formatDistance = (km: number) => {
        if (km < 1) return `${Math.round(km * 1000)}m`;
        return `${km.toFixed(1)}km`;
    };

    const getTierEmoji = (tier: string) => {
        switch (tier) {
            case 'maestro': return '🍄';
            case 'experto': return '⭐';
            case 'activo': return '🔥';
            default: return '🌱';
        }
    };

    const calculateReceive = (agent: Agent) => {
        const fee = 2;
        return amountMxn - fee;
    };

    return (
        <div className="bg-surface text-on-surface min-h-screen pb-24">
            {/* TopAppBar */}
            <header className="w-full top-0 sticky bg-[#E7F6FF] transition-colors duration-300 shadow-[0px_32px_32px_rgba(11,30,38,0.04)] z-50">
                <div className="flex items-center justify-between px-6 py-4 w-full">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onBack}
                            className="text-[#00694C] active:scale-95 duration-200"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <h1 className="font-headline font-bold text-xl text-[#00694C]">Ofertas cerca de ti</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-6 pt-8 space-y-8">
                {/* Summary Context */}
                <section className="space-y-2">
                    <span className="text-on-surface-variant font-label text-sm uppercase tracking-widest">Solicitud de depósito</span>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">${amountMxn}</h2>
                        <span className="text-xl font-headline font-bold text-on-surface-variant">MXN</span>
                    </div>
                    <p className="text-on-surface-variant text-sm font-body">
                        {loadingAgents ? 'Buscando agentes...' : `${agents.length} agentes encontrados cerca de ti`}
                    </p>
                </section>

                {/* Map View Section */}
                <section>
                    <MapSim type="deposit" />
                </section>

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {/* Offers List - Real Data */}
                <div className="space-y-6">
                    {loadingAgents ? (
                        <div className="text-center py-8">
                            <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
                            <p className="text-on-surface-variant mt-2">Cargando ofertas...</p>
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="text-center py-8">
                            <span className="material-symbols-outlined text-4xl text-on-surface-variant">search_off</span>
                            <p className="text-on-surface-variant mt-2">No hay agentes disponibles</p>
                        </div>
                    ) : (
                        agents.map((agent, index) => (
                            <div 
                                key={agent.id} 
                                className={`relative group ${index === 0 ? 'ring-2 ring-primary' : ''} rounded-xl p-6 shadow-[0px_32px_32px_rgba(11,30,38,0.04)] ring-1 ring-outline-variant/10 flex flex-col gap-5 transition-transform hover:scale-[1.01] duration-300`}
                            >
                                {index === 0 && (
                                    <div className="absolute -top-3 left-6 z-10">
                                        <span className="bg-primary text-on-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Mejor oferta</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center text-primary">
                                            <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
                                                {agent.type === 'farmacia' ? 'local_pharmacy' : agent.type === 'tienda' ? 'storefront' : 'business'}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1">
                                                <h3 className="font-bold text-lg">{agent.name}</h3>
                                                <span>{getTierEmoji(agent.tier)}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-on-surface-variant text-xs">
                                                <span className="material-symbols-outlined text-xs">near_me</span>
                                                <span>{formatDistance(agent.distance_km)}</span>
                                                <span>•</span>
                                                <span className="text-primary">{agent.trades_completed} trades</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-xs text-on-surface-variant font-label uppercase">Comisión</span>
                                        <span className="text-primary font-bold">$2 MXN</span>
                                    </div>
                                </div>
                                <div className="bg-surface-container-low rounded-lg p-4 flex justify-between items-center">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tight">Recibimos</p>
                                        <p className="font-bold text-on-surface">${amountMxn} MXN</p>
                                    </div>
                                    <span className="material-symbols-outlined text-outline-variant">trending_flat</span>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[10px] text-accent uppercase font-bold tracking-tight">Recibes</p>
                                        <p className="font-bold text-on-surface text-lg">${calculateReceive(agent)} MXN</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onSelectOffer(agent.stellar_address)}
                                    disabled={loading || !agent.online}
                                    className="w-full h-[46px] bg-gradient-to-r from-primary to-primary-container text-white font-semibold rounded-lg shadow-md active:scale-95 duration-200 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {!agent.online ? 'Agente no disponible' : loading ? 'Bloqueando fondos…' : 'Aceptar esta oferta'}
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Rate Info */}
                <div className="bg-surface-container-low rounded-2xl p-6 border border-primary/10">
                    <div className="flex gap-4 items-center justify-between">
                        <div className="flex gap-4">
                            <span className="material-symbols-outlined text-primary">info</span>
                            <p className="text-sm text-on-surface-variant leading-relaxed">
                                Tasas basadas en el mercado actual. 1 USDC = ${usdcRate} MXN
                            </p>
                        </div>
                        <span className="text-xs text-on-surface-variant">USD/MXN</span>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DepositMap;
