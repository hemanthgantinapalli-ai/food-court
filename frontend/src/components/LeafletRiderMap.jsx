/**
 * LeafletRiderMap.jsx — FREE Rider Navigation Map (Leaflet + OpenStreetMap + OSRM)
 *
 * HYPER-REALISTIC VERSION:
 *  • 100% Free — No API key, no billing, no Google
 *  • Smooth real-time positioning with LERP interpolation
 *  • Live Radar Pulse & Haptic-style visual feedback
 *  • Premium Mission HUD for Rider Workflow
 */

import React, { useEffect, useState, useRef } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Polyline,
    Popup,
    useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { Package, MapPin, Navigation, Clock, Building } from 'lucide-react';

// Fix Leaflet default icon paths in bundlers
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

// ─── STYLES FOR ANIMATIONS ──────────────────────────────────────────────────
if (typeof document !== 'undefined') {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        @keyframes radar-pulse-success {
            0% { transform: scale(0.5); opacity: 0.8; }
            100% { transform: scale(3); opacity: 0; }
        }
        .rider-pulse-ring {
            position: absolute;
            width: 40px;
            height: 40px;
            background: rgba(16, 185, 129, 0.4);
            border-radius: 50%;
            animation: radar-pulse-success 2s infinite ease-out;
            pointer-events: none;
        }
        .animate-marching-ants {
            stroke-dasharray: 10, 15;
            animation: marching-ants 30s linear infinite;
        }
        @keyframes marching-ants {
            from { stroke-dashoffset: 300; }
            to { stroke-dashoffset: 0; }
        }
    `;
    document.head.appendChild(styleTag);
}

// Global fallback if no data exists
const WORLD_CENTER = [20.5937, 78.9629]; // India Center

const makeDynamicCustomerIcon = (addressLabel = 'Customer') =>
    L.icon({
        iconUrl: '/markers/user.png',
        iconSize: [45, 45],
        iconAnchor: [22, 45],
        popupAnchor: [0, -45],
    });

const makeDynamicRestaurantIcon = (status, imageUrl) => {
    return L.icon({
        iconUrl: '/markers/restaurant.png',
        iconSize: [50, 50],
        iconAnchor: [25, 50],
        popupAnchor: [0, -50],
    });
};

const makeRiderIcon = (heading = 0, statusLabel = null) =>
    L.divIcon({
        className: '',
        html: `
            <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
                <div class="rider-pulse-ring"></div>
                ${statusLabel ? `<div style="background:#0f172a; color:#10b981; font-[900]; font-size:8px; padding:3px 10px; border-radius:8px; border:1px solid rgba(16,185,129,0.3); margin-bottom:14px; white-space:nowrap; letter-spacing:0.15em; box-shadow:0 10px 20px rgba(0,0,0,0.2);">${statusLabel}</div>` : ''}
                <div style="font-size:52px; line-height:1; filter: drop-shadow(0 0 20px rgba(16,185,129,0.5)); transform: rotate(${heading}deg); transition: transform 0.6s ease-out; z-index:10;">🛵</div>
            </div>
        `,
        iconSize: [200, 120],
        iconAnchor: [100, 85],
    });

function FitBoundsToMarkers({ points }) {
    const map = useMap();
    useEffect(() => {
        const validPoints = points.filter(p => p && p.lat && p.lng && (p.lat !== 0 || p.lng !== 0));
        if (validPoints.length > 0) {
            const bounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [100, 100], animate: true });
        }
    }, [points, map]);
    return null;
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

export default function LeafletRiderMap({ 
    riderPos, 
    restaurantPos, 
    customerPos, 
    orderStatus,
    restaurantName = "Restaurant",
    customerAddress = "Customer"
}) {
    const [routePoints, setRoutePoints] = useState([]);
    const [eta, setEta]                 = useState(null);
    const lastFetchRef                  = useRef('');
    const [isFollowing, setIsFollowing] = useState(true);

    const animRef    = useRef(null);
    const displayRef = useRef(null);
    const targetRef  = useRef(null);
    const [displayPos, setDisplayPos] = useState(null);
    const [heading, setHeading]       = useState(riderPos?.heading ?? 0);

    const isPickedUp  = ['picked_up', 'on_the_way'].includes(orderStatus);
    
    // 🛡️ DYNAMIC DATA SNAPPING: Never use defaults if actual data is available
    const effectiveRestPos  = { 
        lat: Number(restaurantPos?.lat || 0), 
        lng: Number(restaurantPos?.lng || 0) 
    };
    const effectiveCustPos  = { 
        lat: Number(customerPos?.lat || 0), 
        lng: Number(customerPos?.lng || 0) 
    };
    
    const destination = isPickedUp ? effectiveCustPos : effectiveRestPos;

    // Use restaurant as start if just picked up, else use rider current pos
    const startPos = (orderStatus === 'picked_up') ? effectiveRestPos : (riderPos || effectiveRestPos);

    useEffect(() => {
        let finalPos = (orderStatus === 'picked_up') ? effectiveRestPos : riderPos;
        if (!finalPos?.lat) return;
        targetRef.current = { lat: finalPos.lat, lng: finalPos.lng };
        setHeading(riderPos?.heading ?? 0);
        
        if (!displayRef.current) {
            displayRef.current = { lat: finalPos.lat, lng: finalPos.lng };
            setDisplayPos(displayRef.current);
        }

        const LERP_FACTOR = 0.08; 
        const animate = () => {
            if (!displayRef.current || !targetRef.current) return;
            const cur = displayRef.current;
            const tgt = targetRef.current;
            const nLat = cur.lat + (tgt.lat - cur.lat) * LERP_FACTOR;
            const nLng = cur.lng + (tgt.lng - cur.lng) * LERP_FACTOR;
            displayRef.current = { lat: nLat, lng: nLng };
            setDisplayPos({ lat: nLat, lng: nLng });
            if (Math.abs(nLat - tgt.lat) + Math.abs(nLng - tgt.lng) > 0.00001) animRef.current = requestAnimationFrame(animate);
        };
        if (animRef.current) cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(animate);
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [riderPos?.lat, riderPos?.lng, orderStatus]);

    function MapFollower({ pos, following }) {
        const map = useMap();
        useEffect(() => { if (following && pos?.lat) map.setView([pos.lat, pos.lng], map.getZoom(), { animate: true }); }, [pos, following]);
        return null;
    }

    useEffect(() => {
        if (!startPos?.lat || !destination?.lat || destination.lat === 0) return;
        const key = `${Math.round(startPos.lat*1000)},${Math.round(startPos.lng*1000)}->${destination.lat},${destination.lng}`;
        if (lastFetchRef.current === key) return;
        lastFetchRef.current = key;
        const fetchRoute = async () => {
            try {
                const url = `${OSRM_BASE}/${startPos.lng},${startPos.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
                const res  = await fetch(url);
                const data = await res.json();
                if (data.routes?.[0]) {
                    const distKm  = data.routes[0].distance / 1000;
                    const etaMins = Math.max(1, Math.round((distKm / 30) * 60));
                    setRoutePoints(data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]));
                    setEta({ text: `${etaMins} MIN`, distance: `${distKm.toFixed(1)} KM` });
                }
            } catch (e) { console.error('Route fail:', e); }
        };
        fetchRoute();
    }, [startPos, destination]);

    const center = displayPos?.lat ? [displayPos.lat, displayPos.lng] : (effectiveRestPos.lat ? [effectiveRestPos.lat, effectiveRestPos.lng] : WORLD_CENTER);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <MapContainer center={center} zoom={17} style={{ width: '100%', height: '100%' }} attributionControl={false} onMouseDown={() => setIsFollowing(false)}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                <MapFollower pos={displayPos} following={isFollowing} />
                <FitBoundsToMarkers points={[displayPos, effectiveRestPos, effectiveCustPos]} />

                {effectiveRestPos.lat !== 0 && (
                    <Marker position={[effectiveRestPos.lat, effectiveRestPos.lng]} icon={makeDynamicRestaurantIcon(orderStatus)}>
                        <Popup><b>{restaurantName}</b></Popup>
                    </Marker>
                )}
                {effectiveCustPos.lat !== 0 && (
                    <Marker position={[effectiveCustPos.lat, effectiveCustPos.lng]} icon={makeDynamicCustomerIcon(customerAddress)}>
                         <Popup><b>{customerAddress}</b></Popup>
                    </Marker>
                )}
                {displayPos && (
                    <Marker 
                        position={[
                            displayPos.lat === effectiveCustPos.lat ? displayPos.lat + 0.00005 : displayPos.lat, 
                            displayPos.lng === effectiveCustPos.lng ? displayPos.lng + 0.00005 : displayPos.lng
                        ]} 
                        icon={makeRiderIcon(heading, isPickedUp ? 'MISSION: DELIVERY' : 'MISSION: PICKUP')} 
                    />
                )}
                {routePoints.length > 0 && <Polyline positions={routePoints} pathOptions={{ color: isPickedUp ? '#3b82f6' : '#f97316', weight: 8, opacity: 0.8, className: 'animate-marching-ants' }} />}
            </MapContainer>

            {/* ── MISSION OVERLAY ── */}
            <div className="absolute top-20 left-6 z-[1000] animate-in slide-in-from-left duration-500">
                <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 max-w-[280px]">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                        {isPickedUp ? <MapPin className="text-blue-400" size={20} /> : <Building className="text-orange-400" size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] mb-0.5">TARGET DESTINATION</p>
                        <p className="text-xs font-black text-white truncate">{isPickedUp ? customerAddress : restaurantName}</p>
                    </div>
                </div>
            </div>

            {eta && (
                <div className="absolute bottom-6 left-5 right-5 z-[1000]">
                    <div className="bg-slate-900/95 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-white/10 flex justify-between items-center text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                                <Navigation className="text-blue-400" size={20} />
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] mb-0.5">REMAINING TIME</p>
                                <p className="text-2xl font-black text-white leading-none tracking-tighter">{eta.text}</p>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-white/10 mx-2" />
                        <div className="text-right">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">DISTANCE</p>
                            <p className="font-black text-xl text-blue-400">{eta.distance}</p>
                        </div>
                    </div>
                </div>
            )}

            {!isFollowing && (
                <button onClick={() => setIsFollowing(true)} className="absolute top-24 right-6 z-[1000] bg-blue-600 text-white px-6 py-4 rounded-3xl font-black text-[12px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-2xl flex items-center gap-3 border border-white/20">
                    <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                    Snap to Me
                </button>
            )}

            <div className="absolute top-6 left-6 z-[1000] flex items-center gap-3 bg-white/90 backdrop-blur-md px-5 py-3 rounded-full shadow-2xl border border-emerald-100">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 mt-0.5">TELEMETRY: ONLINE</span>
            </div>
        </div>
    );
}
