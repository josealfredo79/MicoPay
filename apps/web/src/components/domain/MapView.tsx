import { useEffect, useRef, useState } from 'react';
import type { Agent } from '../../types';
import type * as L from 'leaflet';

interface MapViewProps {
  agents: Agent[];
  userLat: number;
  userLng: number;
  onSelectAgent: (agent: Agent) => void;
  selectedAgentId?: string;
  className?: string;
}

export function MapView({
  agents,
  userLat,
  userLng,
  onSelectAgent,
  selectedAgentId,
  className = '',
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let map: L.Map | null = null;

    async function initMap() {
      if (!mapContainer.current || mapInstance.current) return;

      try {
        const leaflet = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        if (!mounted) return;

        map = leaflet.map(mapContainer.current, {
          center: [userLat, userLng],
          zoom: 15,
          zoomControl: false,
        });

        leaflet.control.zoom({ position: 'bottomright' }).addTo(map);

        leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        leaflet.control.attribution({ position: 'bottomleft' }).addTo(map);

        mapInstance.current = map;
        setIsMapReady(true);
      } catch (err) {
        console.error('Failed to load map:', err);
        setError('No se pudo cargar el mapa');
      }
    }

    initMap();

    return () => {
      mounted = false;
      if (map) {
        map.remove();
        mapInstance.current = null;
      }
    };
  }, [userLat, userLng]);

  useEffect(() => {
    if (!isMapReady || !mapInstance.current) return;

    const map = mapInstance.current;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    agents.forEach((agent) => {
      if (agent.latitude == null || agent.longitude == null) return;
      
      const isSelected = agent.stellar_address === selectedAgentId;
      const icon = createAgentIcon(agent.tier, isSelected);

      const marker = (window as unknown as { L: typeof import('leaflet') }).L
        .marker([agent.latitude, agent.longitude], { icon })
        .addTo(map);

      marker.bindPopup(`
        <div class="p-2">
          <strong>${agent.name}</strong><br/>
          <span class="text-sm">$${agent.distance_km}km</span><br/>
          <span class="text-xs text-gray-500">${agent.trades_completed} trades</span>
        </div>
      `);

      marker.on('click', () => {
        onSelectAgent(agent);
      });

      markersRef.current.push(marker);
    });
  }, [agents, isMapReady, selectedAgentId, onSelectAgent]);

  if (error) {
    return (
      <div className={`relative w-full h-64 bg-surface-container-low rounded-[32px] overflow-hidden border border-outline-variant/30 ${className}`}>
        <div className="flex items-center justify-center h-full">
          <p className="text-on-surface-variant">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-64 bg-surface-container-low rounded-[32px] overflow-hidden border border-outline-variant/30 ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-outline-variant/10 flex items-center gap-2 shadow-lg z-[1000]">
        <span className="material-symbols-outlined text-primary text-sm font-bold">location_on</span>
        <p className="text-[10px] font-bold text-on-surface uppercase tracking-widest">CDMX · ZONA CENTRO</p>
      </div>
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline-variant/10 flex items-center gap-2 shadow-lg z-[1000]">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <p className="text-[10px] font-bold text-on-surface">{agents.length} agentes</p>
      </div>
    </div>
  );
}

function createAgentIcon(
  tier: Agent['tier'],
  isSelected: boolean
): L.DivIcon {
  const colors: Record<string, string> = {
    espora: '#8B5CF6',
    activo: '#10B981',
    experto: '#F59E0B',
    maestro: '#EF4444',
  };

  const color = colors[tier] || '#10B981';
  const size = isSelected ? 48 : 40;

  return (window as unknown as { L: typeof import('leaflet') }).L.divIcon({
    className: 'agent-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      ">
        <span style="font-size: ${size * 0.5}px;">🍄</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
