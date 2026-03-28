/**
 * LeafletTrackingMap.jsx — FREE Live Tracking Map (Leaflet + OpenStreetMap + OSRM)
 *
 * HYPER-REALISTIC VERSION:
 *  • 100% Free — No API key, no billing, no Google
 *  • Three custom markers: Restaurant 🍳, Customer 🏠, Rider 🛵
 *  • Hyper-smooth rider icon movement via LERP interpolation + requestAnimationFrame
 *  • Neon Breadcrumb Trails (path history)
 *  • Live Radar Pulse & Glassmorphic UI overlays
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Polyline,
    Popup,
    useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { socket } from '../api/socket';
import { Clock, MapPin, Navigation } from 'lucide-react';

// Fix Leaflet's broken default icon path in bundlers
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

// ─── ADD STYLES FOR ANIMATIONS ────────────────────────────────────────────────
if (typeof document !== 'undefined') {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        @keyframes radar-pulse {
            0% { transform: scale(0.5); opacity: 0.8; }
            100% { transform: scale(2.5); opacity: 0; }
        }
        .radar-pulse-ring {
            position: absolute;
            width: 40px;
            height: 40px;
            background: rgba(59, 130, 246, 0.4);
            border-radius: 50%;
            animation: radar-pulse 2s infinite ease-out;
            pointer-events: none;
        }
        .animate-marching-ants {
            stroke-dasharray: 10, 10;
            animation: marching-ants 20s linear infinite;
        }
        @keyframes marching-ants {
            from { stroke-dashoffset: 200; }
            to { stroke-dashoffset: 0; }
        }
        .leaflet-marker-icon {
            transition: transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1);
        }
    `;
    document.head.appendChild(styleTag);
}

// ─── Custom marker icons via divIcon ─────────────────────────────────────────
const makeIcon = (emoji, size = 38) =>
    L.divIcon({
        className: '',
        html: `<div style="
            font-size:${size}px;
            line-height:1;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
            display:flex;
            align-items:center;
            justify-content:center;
        ">${emoji}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
    });

const makeRiderIcon = (heading = 0, etaMins = null, speed = 0) =>
    L.divIcon({
        className: '',
        html: `
            <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
                ${speed > 0 ? '<div class="radar-pulse-ring"></div>' : ''}
                ${etaMins ? `
                    <div style="
                        background: rgba(15, 23, 42, 0.95); 
                        backdrop-filter: blur(8px);
                        color: white; 
                        padding: 4px 12px; 
                        border-radius: 10px; 
                        font-size: 10px; 
                        font-weight: 950; 
                        white-space: nowrap;
                        margin-bottom: 12px;
                        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                        border: 1px solid rgba(255,255,255,0.1);
                        letter-spacing: 0.1em;
                        z-index: 10;
                        animation: bounce 2s infinite;
                    ">ETA: ${etaMins} MINS</div>
                ` : ''}
                <div style="
                    font-size:38px;
                    line-height:1;
                    filter: drop-shadow(0 0 15px rgba(59,130,246,0.6));
                    transform: rotate(${heading}deg);
                    transition: transform 0.6s ease-out;
                    z-index: 5;
                ">🛵</div>
            </div>
        `,
        iconSize: [140, 100], 
        iconAnchor: [70, 80],
        popupAnchor: [0, -80],
    });

const makeDynamicRestaurantIcon = (status, imageUrl) => {
    return L.icon({
        iconUrl: '/markers/restaurant.png',
        iconSize: [50, 50],
        iconAnchor: [25, 50],
        popupAnchor: [0, -50],
        className: 'restaurant-marker-pulse'
    });
};

const makeDynamicCustomerIcon = () => {
    return L.icon({
        iconUrl: '/markers/user.png',
        iconSize: [45, 45],
        iconAnchor: [22, 45],
        popupAnchor: [0, -45],
    });
};

// ─── Constants ───────────────────────────────────────────────────────────────
const LERP_FACTOR    = 0.08; 
const DIST_THRESHOLD = 0.00001;
const OSRM_BASE      = 'https://router.project-osrm.org/route/v1/driving';

// ─── Sub-component: Fit bounds ──────────────────────────────────────────────
function FitBoundsToMarkers({ points }) {
    const map = useMap();
    useEffect(() => {
        const validPoints = points.filter(p => p && p.lat && p.lng && (p.lat !== 0 || p.lng !== 0));
        if (validPoints.length > 0) {
            const bounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [100, 100], animate: true, maxZoom: 16 });
        }
    }, [points, map]);
    return null;
}

export default function LeafletTrackingMap({ order }) {
    const animRef     = useRef(null);
    const displayRef  = useRef(null);
    const targetRef   = useRef(null);
    const etaTimerRef = useRef(null);

    const [displayPos, setDisplayPos]       = useState(null);
    const [riderHeading, setRiderHeading]   = useState(0);
    const [riderSpeed, setRiderSpeed]       = useState(0);
    const [routePoints, setRoutePoints]     = useState([]);   
    const [eta, setEta]                     = useState(null); 
    const [mapReady, setMapReady]           = useState(false);
    const [history, setHistory]             = useState([]); // For breadcrumbs

    const rest = order?.restaurant;
    const cust = order?.deliveryAddress;

    const restaurantPos = {
        lat: Number(order?.restaurantLocation?.lat || rest?.location?.latitude || rest?.latitude || 0) || 16.2435,
        lng: Number(order?.restaurantLocation?.lng || rest?.location?.longitude || rest?.longitude || 0) || 80.6480,
    };
    const customerPos = {
        lat: Number(order?.userLocation?.lat || cust?.latitude || cust?.lat || 0) || 16.2340,
        lng: Number(order?.userLocation?.lng || cust?.longitude || cust?.lng || 0) || 80.6550,
    };

    const isPickedUp  = ['picked_up', 'on_the_way', 'delivered'].includes(order?.orderStatus);
    const hasRiderAssigned = !!order?.rider;

    const mapCenter   = displayPos ?? restaurantPos;

    const fetchRoute = useCallback(async (origin, dest, phase) => {
        if (!origin?.lat || !dest?.lat) return;
        try {
            const url = `${OSRM_BASE}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
            const res  = await fetch(url);
            const data = await res.json();
            if (data.routes?.[0]?.geometry?.coordinates) {
                const pts = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                setRoutePoints(pts);
                const distKm  = data.routes[0].distance / 1000;
                const etaMins = Math.max(2, Math.round((distKm / 30) * 60)); 
                let text = `${etaMins} MIN`;
                if (phase === 'delivery' && etaMins <= 1) text = 'ARRIVING!';
                setEta({ text, distance: `${distKm.toFixed(1)} KM`, phase });
            }
        } catch (err) { console.error('OSRM fail:', err); }
    }, []);

    const animate = useCallback(() => {
        if (!displayRef.current || !targetRef.current) return;
        const cur = displayRef.current;
        const tgt = targetRef.current;

        const newLat = cur.lat + (tgt.lat - cur.lat) * LERP_FACTOR;
        const newLng = cur.lng + (tgt.lng - cur.lng) * LERP_FACTOR;
        displayRef.current = { lat: newLat, lng: newLng };
        setDisplayPos({ lat: newLat, lng: newLng });

        if (Math.abs(newLat - tgt.lat) + Math.abs(newLng - tgt.lng) > DIST_THRESHOLD) {
            animRef.current = requestAnimationFrame(animate);
        }
    }, []);

    useEffect(() => {
        let initPos = null;
        if (order?.riderLocation?.lat) {
            initPos = { lat: order.riderLocation.lat, lng: order.riderLocation.lng };
        } else if (order?.rider?.currentLocation?.latitude) {
            initPos = { lat: order.rider.currentLocation.latitude, lng: order.rider.currentLocation.longitude };
        } else if (isPickedUp) {
            initPos = restaurantPos;
        }

        if (initPos && initPos.lat !== 0) {
            displayRef.current = initPos;
            targetRef.current  = initPos;
            setDisplayPos(initPos);
        }
        setMapReady(true);
    }, [order?.rider, order?.orderStatus]);

    useEffect(() => {
        if (!order?._id) return;
        const handleLocation = ({ lat, lng, heading, speed }) => {
            if (!lat || !lng) return;
            const newTarget = { lat, lng };
            targetRef.current = newTarget;
            setRiderHeading(heading ?? 0);
            setRiderSpeed(speed ?? 0);
            setHistory(prev => [[lat, lng], ...prev].slice(0, 8)); // History for trail

            if (!displayRef.current) {
                displayRef.current = newTarget;
                setDisplayPos(newTarget);
            }

            if (animRef.current) cancelAnimationFrame(animRef.current);
            animRef.current = requestAnimationFrame(animate);

            if (etaTimerRef.current) clearTimeout(etaTimerRef.current);
            etaTimerRef.current = setTimeout(() => {
                fetchRoute(newTarget, isPickedUp ? customerPos : restaurantPos, isPickedUp ? 'delivery' : 'pickup');
            }, 2000);
        };
        socket.on('locationUpdate', handleLocation);
        socket.on('rider_position_update', (data) => {
            if (data.riderId === order.rider?._id?.toString()) {
                handleLocation({ lat: data.location.lat, lng: data.location.lng, heading: data.heading, speed: data.speed });
            }
        });
        return () => {
            socket.off('locationUpdate'); socket.off('rider_position_update');
            if (animRef.current) cancelAnimationFrame(animRef.current);
            if (etaTimerRef.current) clearTimeout(etaTimerRef.current);
        };
    }, [order?._id, order?.rider, animate, fetchRoute, isPickedUp, restaurantPos, customerPos]);

    useEffect(() => {
        if (!mapReady || order?.orderStatus === 'delivered') return;
        const currentPos = displayRef.current || restaurantPos;
        if (isPickedUp) fetchRoute(currentPos, customerPos, 'delivery');
        else if (hasRiderAssigned && displayPos) fetchRoute(currentPos, restaurantPos, 'pickup');
        else fetchRoute(restaurantPos, customerPos, 'cooking');
    }, [order?.orderStatus, mapReady, hasRiderAssigned]);

    if (!mapReady) return null;

    return (
        <div className="relative w-full h-full rounded-[3rem] overflow-hidden shadow-2xl border border-white">
            <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={15}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
                attributionControl={false}
            >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                <FitBoundsToMarkers points={[restaurantPos, customerPos, displayPos]} />

                {/* Trail */}
                {history.length > 1 && (
                    <Polyline positions={history} pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.3, dashArray: '5, 10' }} />
                )}

                {/* Markers */}
                <Marker position={[restaurantPos.lat, restaurantPos.lng]} icon={makeDynamicRestaurantIcon(order?.orderStatus, order?.restaurant?.image)} />
                <Marker position={[customerPos.lat, customerPos.lng]} icon={makeDynamicCustomerIcon()} />
                {displayPos && (
                    <Marker 
                        position={[
                            displayPos.lat === customerPos.lat ? displayPos.lat + 0.00005 : displayPos.lat, 
                            displayPos.lng === customerPos.lng ? displayPos.lng + 0.00005 : displayPos.lng
                        ]} 
                        icon={makeRiderIcon(riderHeading, eta?.text?.split(' ')[0], riderSpeed)} 
                    />
                )}

                {/* Route */}
                {routePoints.length > 0 && (
                    <Polyline
                        positions={routePoints}
                        pathOptions={{
                            color: order?.orderStatus === 'delivered' ? '#10b981' : '#3b82f6', 
                            weight: 8, opacity: 0.8, lineJoin: 'round', lineCap: 'round', className: 'animate-marching-ants'
                        }}
                    />
                )}
            </MapContainer>

            {/* UI Overlays */}
            <div className="absolute top-6 left-6 z-[1000] flex items-center gap-3 bg-white/80 backdrop-blur-xl px-5 py-3 rounded-full shadow-2xl border border-white">
                <div className={`w-3 h-3 rounded-full ${displayPos ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                    {displayPos ? 'REAL-TIME SATELLITE TRACKING' : 'CONNECTING TO COURIER...'}
                </span>
            </div>

            {eta && order?.orderStatus !== 'delivered' && (
                <div className="absolute bottom-6 left-6 right-6 z-[1000]">
                    <div className="bg-slate-900/95 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-white/10 flex justify-between items-center text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                                <Clock className="text-blue-400" size={20} />
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] mb-0.5">EST. ARRIVAL</p>
                                <p className="text-2xl font-black text-white leading-none tracking-tighter">
                                    {eta.text}
                                </p>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="text-right">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">DISTANCE</p>
                            <p className="font-black text-xl text-blue-400">{eta.distance}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
