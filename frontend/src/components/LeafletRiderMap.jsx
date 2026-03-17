// ─── Precision Tenali Coordinates (Reference Points) ────────────────────────
const LOCATIONS = {
    RESTAURANT: { lat: 16.2435, lng: 80.6480 }, // Ramalingeswara Pet (Center)
    CUSTOMER:   { lat: 16.2340, lng: 80.6550 }, // Chinaravuru (South-East)
    RIDER:      { lat: 16.2510, lng: 80.6390 }  // Sultanabad (North)
};

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
import { Package, MapPin, Navigation } from 'lucide-react';

// Fix Leaflet default icon paths in bundlers
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const makeDynamicCustomerIcon = () =>
    L.divIcon({
        className: '',
        html: `
            <div style="position:relative; width: 44px; height: 50px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <svg width="44" height="50" viewBox="0 0 44 50" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
                    <path d="M22 50L6 32C3 27 0 22 0 16C0 7 7 0 22 0C37 0 44 7 44 16C44 22 41 27 38 32L22 50Z" fill="white"/>
                    <path d="M22 46L8 30C5 25 2 20 2 16C2 8 8 2 22 2C36 2 42 8 42 16C42 20 39 25 36 30L22 46Z" fill="#3b82f6"/>
                </svg>
                <div style="position:absolute; top: 8px; width: 28px; height: 28px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                    <span style="font-size:18px;">🏠</span>
                </div>
            </div>
        `,
        iconSize: [44, 50],
        iconAnchor: [22, 50],
        popupAnchor: [0, -50],
    });

const makeDynamicRestaurantIcon = (status, imageUrl) => {
    const isPreparing = ['confirmed', 'preparing'].includes(status);
    const isReady = status === 'ready';
    const borderColor = isPreparing ? '#f97316' : (isReady ? '#10b981' : '#f97316');
    const fallbackEmoji = isPreparing ? '🥘' : (isReady ? '🛍️' : '🍳');
    
    return L.divIcon({
        className: '',
        html: `
            <div style="position:relative; width: 50px; height: 62px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <svg width="50" height="62" viewBox="0 0 50 62" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
                    <path d="M25 62L8 38C4 32 0 26 0 17C0 8 7 0 25 0C43 0 50 8 50 17C50 26 46 32 42 38L25 62Z" fill="white"/>
                    <path d="M25 58L10 36C6 30 2 25 2 17C2 9 8 2 25 2C42 2 48 9 48 17C48 25 44 30 40 36L25 58Z" fill="${borderColor}"/>
                </svg>
                <div class="${isPreparing ? 'animate-bounce' : ''}" style="
                    position:absolute; top: 8px; width: 34px; height: 34px; background: white; border-radius: 50%; 
                    display: flex; align-items: center; justify-content: center; overflow: hidden;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
                ">
                    ${imageUrl ? `<img src="${imageUrl}" style="width:100%; height:100%; object-fit:cover;" />` : `<span style="font-size:20px;">${fallbackEmoji}</span>`}
                </div>
            </div>
        `,
        iconSize: [50, 62],
        iconAnchor: [25, 62],
        popupAnchor: [0, -62],
    });
};

const makeRiderIcon = (heading = 0, statusText = null, etaText = null) =>
    L.divIcon({
        className: '',
        html: `
            <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
                ${(statusText || etaText) ? `
                    <div style="
                        background: #1e293b; 
                        color: white; 
                        padding: 6px 14px; 
                        border-radius: 12px; 
                        font-size: 10px; 
                        font-weight: 900; 
                        white-space: nowrap;
                        margin-bottom: 12px;
                        box-shadow: 0 8px 24px rgba(0,0,0,0.25);
                        border: 1px solid rgba(255,255,255,0.15);
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        animation: bounce-slow 2s infinite ease-in-out;
                    ">
                        ${statusText || ''}
                        ${(statusText && etaText) ? '<span style="opacity:0.3;">|</span>' : ''}
                        ${etaText ? `<span style="color:#fb923c;">${etaText}</span>` : ''}
                    </div>
                ` : ''}
                <div style="
                    font-size:48px;
                    line-height:1;
                    filter: drop-shadow(0 6px 15px rgba(0,0,0,0.4));
                    transform: rotate(${heading}deg);
                    transition: transform 0.4s ease-out;
                ">🛵</div>
            </div>
        `,
        iconSize: [180, 110],
        iconAnchor: [90, 80],
        popupAnchor: [0, -80],
    });

// Automatically fit map bounds to show all active markers
function FitBoundsToMarkers({ points }) {
    const map = useMap();
    useEffect(() => {
        const validPoints = points.filter(p => p && p.lat && p.lng);
        if (validPoints.length > 0) {
            const bounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [60, 60], animate: true, maxZoom: 16 });
        }
    }, [points, map]);
    return null;
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

export default function LeafletRiderMap({ riderPos, restaurantPos, customerPos, orderStatus }) {
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
    const destination = (isPickedUp ? customerPos : restaurantPos) || (isPickedUp ? LOCATIONS.CUSTOMER : LOCATIONS.RESTAURANT);
    
    // Fallback coordinates for Tenali demo
    const effectiveRestPos  = restaurantPos?.lat ? restaurantPos : LOCATIONS.RESTAURANT;
    const effectiveCustPos  = customerPos?.lat ? customerPos : LOCATIONS.CUSTOMER;
    
    // 📍 CRITICAL SNAPPING: Use restaurant as rider pos if JUST picked up (User panel style)
    const effectiveRiderPos = (orderStatus === 'picked_up') 
        ? effectiveRestPos 
        : (riderPos?.lat ? riderPos : LOCATIONS.RIDER);

    const mapCenter = displayPos
        ?? effectiveRiderPos
        ?? effectiveRestPos
        ?? LOCATIONS.CUSTOMER;

    // Update target for interpolation
    useEffect(() => {
        // 📍 CRITICAL: If picked up, force target to restaurant to prevent GPS wandering
        let finalPos = riderPos;
        if (orderStatus === 'picked_up') {
            finalPos = effectiveRestPos;
        }

        if (!finalPos?.lat) return;
        targetRef.current = { lat: finalPos.lat, lng: finalPos.lng };
        setHeading(riderPos?.heading ?? 0);
        
        if (!displayRef.current) {
            displayRef.current = { lat: finalPos.lat, lng: finalPos.lng };
            setDisplayPos(displayRef.current);
        }

        const LERP_FACTOR = 0.06; 
        const animate = () => {
            if (!displayRef.current || !targetRef.current) return;
            const cur = displayRef.current;
            const tgt = targetRef.current;

            const nLat = cur.lat + (tgt.lat - cur.lat) * LERP_FACTOR;
            const nLng = cur.lng + (tgt.lng - cur.lng) * LERP_FACTOR;

            displayRef.current = { lat: nLat, lng: nLng };
            setDisplayPos({ lat: nLat, lng: nLng });

            if (Math.abs(nLat - tgt.lat) + Math.abs(nLng - tgt.lng) > 0.00001) {
                animRef.current = requestAnimationFrame(animate);
            }
        };

        if (animRef.current) cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(animate);

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [riderPos?.lat, riderPos?.lng, riderPos?.heading]);

    // Recenter map logic
    function MapFollower({ pos, following }) {
        const map = useMap();
        useEffect(() => {
            if (following && pos?.lat) {
                map.setView([pos.lat, pos.lng], map.getZoom(), { animate: true });
            }
        }, [pos, following, map]);
        return null;
    }

    // Fetch OSRM route whenever rider position or destination changes
    useEffect(() => {
        if (!riderPos?.lat || !destination?.lat) return;

        const discretize = (val) => Math.round(val * 1000) / 1000;
        const key = `${discretize(riderPos.lat)},${discretize(riderPos.lng)}->${destination.lat},${destination.lng}`;
        if (lastFetchRef.current === key) return;
        lastFetchRef.current = key;

        const fetchRoute = async () => {
            try {
                const url = `${OSRM_BASE}/${riderPos.lng},${riderPos.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
                const res  = await fetch(url);
                const data = await res.json();
                if (data.routes?.[0]?.geometry?.coordinates) {
                    const pts = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                    setRoutePoints(pts);
                    const distKm  = data.routes[0].distance / 1000;
                    const etaMins = Math.max(1, Math.round((distKm / 30) * 60));
                    setEta({ text: `${etaMins} min`, distance: `${distKm.toFixed(1)} km` });
                }
            } catch (e) {
                console.error('LeafletRiderMap route fetch failed:', e);
            }
        };

        fetchRoute();
    }, [riderPos?.lat, riderPos?.lng, destination?.lat, destination?.lng]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={17}
                style={{ width: '100%', height: '100%' }}
                attributionControl={false}
                scrollWheelZoom={true}
                onMouseDown={() => setIsFollowing(false)}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                <MapFollower pos={displayPos || effectiveRiderPos} following={isFollowing} />
                <FitBoundsToMarkers points={[displayPos || effectiveRiderPos, effectiveRestPos, effectiveCustPos]} />

                <Marker position={[effectiveRestPos.lat, effectiveRestPos.lng]} icon={makeDynamicRestaurantIcon(orderStatus)} />
                <Marker position={[effectiveCustPos.lat, effectiveCustPos.lng]} icon={makeDynamicCustomerIcon()} />

                {(displayPos || effectiveRiderPos) && (
                    <Marker 
                        position={[displayPos?.lat || effectiveRiderPos.lat, displayPos?.lng || effectiveRiderPos.lng]} 
                        icon={makeRiderIcon(heading, isPickedUp ? 'DELIVERING' : 'HEADING TO REST', eta?.text)} 
                    />
                )}

                {routePoints.length > 0 && (
                    <Polyline
                        positions={routePoints}
                        pathOptions={{ 
                            color: isPickedUp ? '#3b82f6' : '#f97316', 
                            weight: 6, 
                            opacity: 0.9,
                            lineJoin: 'round',
                            dashArray: '10, 10', 
                            className: 'animate-marching-ants'
                        }}
                    />
                )}
            </MapContainer>

            {/* ── Floating Mission HUD ── */}
            {eta && (
                <div className="absolute bottom-6 left-4 right-4 z-[1000] animate-in slide-in-from-bottom duration-700">
                    <div className="bg-slate-950/90 backdrop-blur-xl px-6 py-5 rounded-[2.5rem] shadow-2xl border border-white/10 flex justify-between items-center text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                                <Navigation className="text-orange-400" size={22} />
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] mb-0.5">
                                    {isPickedUp ? 'Deliver to Chinaravuru' : 'Pickup from Ramalingeswara Pet'}
                                </p>
                                <p className="text-2xl font-black leading-none text-orange-400">{eta.text}</p>
                            </div>
                        </div>
                        <div className="h-10 w-px bg-white/10 mx-2" />
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-slate-400 justify-end mb-0.5">
                                <MapPin size={10} />
                                <p className="text-[8px] font-black uppercase tracking-[0.2em]">Distance</p>
                            </div>
                            <p className="font-black text-white text-sm">{eta.distance}</p>
                        </div>
                    </div>
                </div>
            )}

            {!isFollowing && (
                <button
                    onClick={() => setIsFollowing(true)}
                    className="absolute top-20 right-4 z-[1000] bg-orange-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-500/30 flex items-center gap-3 border border-white/20"
                >
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Snap to Me
                </button>
            )}

            <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-orange-200">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 italic">Rider GPS Active</span>
            </div>
        </div>
    );
}
