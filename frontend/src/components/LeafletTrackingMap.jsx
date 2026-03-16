/**
 * LeafletTrackingMap.jsx — FREE Live Tracking Map (Leaflet + OpenStreetMap + OSRM)
 *
 * Features:
 *  • 100% Free — No API key, no billing, no Google
 *  • Three custom markers: Restaurant 🍳, Customer 🏠, Rider 🛵
 *  • Smooth rider icon movement via LERP interpolation (requestAnimationFrame)
 *  • Rotating rider icon based on heading/bearing
 *  • Road-following route polyline via OSRM (free routing engine)
 *  • Live ETA calculation based on distance and average speed
 *  • Socket.io subscription for real-time location updates
 *  • Order-status-aware: route flips from restaurant → customer on pickup
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
import { Clock, MapPin } from 'lucide-react';

// Fix Leaflet's broken default icon path in bundlers
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

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

const makeRiderIcon = (heading = 0) =>
    L.divIcon({
        className: '',
        html: `<div style="
            font-size:36px;
            line-height:1;
            filter: drop-shadow(0 2px 6px rgba(249,115,22,0.6));
            transform: rotate(${heading}deg);
            transition: transform 0.4s ease-out;
            display:flex;
            align-items:center;
            justify-content:center;
        ">🛵</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
    });

const restaurantIcon = makeIcon('🍽️', 40);
const customerIcon   = makeIcon('🏠', 36);

const makeDynamicRestaurantIcon = (status) => {
    const isPreparing = ['confirmed', 'preparing'].includes(status);
    const isReady = status === 'ready';
    
    let emoji = '🍽️';
    if (isPreparing) emoji = '🥘'; // Cooking
    if (isReady) emoji = '🛍️'; // Ready for pickup
    
    return L.divIcon({
        className: '',
        html: `<div class="${isPreparing ? 'animate-bounce' : ''}" style="
            font-size:32px;
            line-height:1;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
            display:flex;
            align-items:center;
            justify-content:center;
            background: white; 
            border-radius: 50%; 
            width: 48px;
            height: 48px;
            border: 3px solid ${isPreparing ? '#f97316' : (isReady ? '#10b981' : '#cbd5e1')};
            box-shadow: 0 0 15px ${isPreparing ? 'rgba(249,115,22,0.4)' : 'transparent'};
        ">${emoji}</div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24],
    });
};

const makeDynamicCustomerIcon = () => {
    return L.divIcon({
        className: '',
        html: `<div style="
            font-size:32px;
            line-height:1;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
            display:flex;
            align-items:center;
            justify-content:center;
            background: #0f172a; 
            border-radius: 50%; 
            width: 48px;
            height: 48px;
            border: 3px solid #3b82f6;
            box-shadow: 0 0 15px rgba(59,130,246,0.4);
        ">🏠</div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24],
    });
};

// ─── Constants ───────────────────────────────────────────────────────────────
const LERP_FACTOR    = 0.07;
const DIST_THRESHOLD = 0.00001;
const OSRM_BASE      = 'https://router.project-osrm.org/route/v1/driving';

// ─── Sub-component: Fit bounds to all active points ────────────────────────
function FitBoundsToMarkers({ points }) {
    const map = useMap();
    useEffect(() => {
        const validPoints = points.filter(p => p && p.lat && p.lng && (p.lat !== 0 || p.lng !== 0));
        if (validPoints.length > 0) {
            const bounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lng]));
            // Add padding so markers/routes aren't cut off
            map.fitBounds(bounds, { padding: [60, 60], animate: true, maxZoom: 16 });
        }
    }, [points, map]);
    return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * @param {object} order - Populated order object from API
 */
export default function LeafletTrackingMap({ order }) {
    const animRef     = useRef(null);
    const displayRef  = useRef(null);
    const targetRef   = useRef(null);
    const etaTimerRef = useRef(null);

    const [displayPos, setDisplayPos]       = useState(null);
    const [riderHeading, setRiderHeading]   = useState(0);
    const [routePoints, setRoutePoints]     = useState([]);   // [[lat,lng], ...]
    const [eta, setEta]                     = useState(null); // { text, distance }
    const [mapReady, setMapReady]           = useState(false);

    // ─── Derive static positions ──────────────────────────────────────────────
    const restLoc = order?.restaurant?.location ?? {};
    const custLoc = order?.deliveryAddress       ?? {};

    const restaurantPos = {
        lat: Number(restLoc.latitude  ?? restLoc.lat  ?? 0),
        lng: Number(restLoc.longitude ?? restLoc.lng  ?? 0),
    };
    const customerPos = {
        lat: Number(custLoc.latitude  ?? custLoc.lat  ?? 0),
        lng: Number(custLoc.longitude ?? custLoc.lng  ?? 0),
    };

    const isPickedUp  = ['picked_up', 'on_the_way', 'delivered'].includes(order?.orderStatus);
    const hasRiderAssigned = !!order?.rider;
    const isPrePickup = ['placed', 'confirmed', 'preparing', 'ready'].includes(order?.orderStatus);

    // Initial center defaults to restaurant if no rider display pos
    const mapCenter   = displayPos
        ?? (restaurantPos.lat ? restaurantPos : { lat: 17.385, lng: 78.4867 });

    // ─── OSRM Route Fetch ─────────────────────────────────────────────────────
    const fetchRoute = useCallback(async (origin, dest, phase) => {
        if (!origin?.lat || !dest?.lat) return;
        try {
            const url = `${OSRM_BASE}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
            const res  = await fetch(url);
            const data = await res.json();
            if (data.routes?.[0]?.geometry?.coordinates) {
                const pts = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                setRoutePoints(pts);

                // Calculate ETA from distance + avg speed 30km/h
                const distKm  = data.routes[0].distance / 1000;
                // ETA at 30km/h = (dist / 30) * 60 = dist * 2
                const etaMins = Math.max(2, Math.round((distKm / 30) * 60)); // Min 2 mins
                
                let text = `${etaMins} min`;
                if (phase === 'delivery' && etaMins <= 1) text = 'Arriving now!';
                
                setEta({
                    text: text,
                    distance: `${distKm.toFixed(1)} km`,
                    phase: phase
                });
            }
        } catch (err) {
            console.error('OSRM route fetch failed:', err);
        }
    }, []);

    // ─── Animation Loop (LERP) ────────────────────────────────────────────────
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

    // ─── Initialize from DB-persisted location ────────────────────────────────
    useEffect(() => {
        let initPos = null;
        if (order?.liveTracking?.lastLatitude) {
            initPos = { lat: order.liveTracking.lastLatitude, lng: order.liveTracking.lastLongitude };
        } else if (order?.rider?.currentLocation?.latitude) {
            initPos = { lat: order.rider.currentLocation.latitude, lng: order.rider.currentLocation.longitude };
        }
        if (initPos) {
            displayRef.current = initPos;
            targetRef.current  = initPos;
            setDisplayPos(initPos);
        }
        setMapReady(true);
    }, [order?.rider, order?.liveTracking]);

    // ─── Socket: subscribe to live location updates ───────────────────────────
    useEffect(() => {
        if (!order?._id) return;

        const handleLocation = ({ orderId, location, heading, speed }) => {
            if (orderId !== order._id) return;
            if (!location?.lat || !location?.lng) return;

            const newTarget = { lat: location.lat, lng: location.lng };
            targetRef.current = newTarget;
            setRiderHeading(heading ?? 0);

            if (!displayRef.current) {
                displayRef.current = newTarget;
                setDisplayPos(newTarget);
            }

            // Restart LERP animation
            if (animRef.current) cancelAnimationFrame(animRef.current);
            animRef.current = requestAnimationFrame(animate);

            // Debounced route + ETA refresh
            // Debounced route + ETA refresh based on actual phase
            if (etaTimerRef.current) clearTimeout(etaTimerRef.current);
            etaTimerRef.current = setTimeout(() => {
                const isGoingToCust = ['picked_up', 'on_the_way'].includes(order.orderStatus);
                fetchRoute(newTarget, isGoingToCust ? customerPos : restaurantPos, isGoingToCust ? 'delivery' : 'pickup');
            }, 5000);
        };

        socket.on('rider_location_updated', handleLocation);
        socket.on('rider_position_update', (data) => {
            if (data.riderId === order.rider?._id?.toString()) {
                handleLocation({ orderId: order._id, ...data });
            }
        });

        return () => {
            socket.off('rider_location_updated', handleLocation);
            socket.off('rider_position_update');
            if (animRef.current) cancelAnimationFrame(animRef.current);
            if (etaTimerRef.current) clearTimeout(etaTimerRef.current);
        };
    }, [order?._id, order?.rider, animate, fetchRoute, restaurantPos, customerPos]);

    // ─── Determine Route Logic When Component Mounts or Status Changes ────
    useEffect(() => {
        if (!mapReady || order?.orderStatus === 'delivered') return;

        if (isPickedUp) {
            // Phase 3: Rider -> Customer
            fetchRoute(displayPos || restaurantPos, customerPos, 'delivery');
        } else if (hasRiderAssigned && displayPos) {
            // Phase 2: Rider -> Restaurant
            fetchRoute(displayPos, restaurantPos, 'pickup');
        } else {
            // Phase 1: No rider yet, show Restaurant -> Customer distance
            fetchRoute(restaurantPos, customerPos, 'cooking');
        }
    }, [order?.orderStatus, displayPos?.lat, mapReady, hasRiderAssigned]);

    const riderIcon = makeRiderIcon(riderHeading);

    if (!mapReady) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50 rounded-[2.5rem]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Map…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden">
            <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={15}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
                attributionControl={false}
            >
                {/* Free OpenStreetMap tiles */}
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Dynamically frame the map instead of just centering */}
                <FitBoundsToMarkers points={[restaurantPos, customerPos, displayPos]} />

                {/* 🍳 Restaurant Marker */}
                {restaurantPos.lat !== 0 && (
                    <Marker position={[restaurantPos.lat, restaurantPos.lng]} icon={makeDynamicRestaurantIcon(order?.orderStatus)}>
                        <Popup>
                            <strong>🍳 {order?.restaurant?.name || 'Restaurant'}</strong>
                            <br /><small>{['confirmed','preparing'].includes(order?.orderStatus) ? '🔥 Food is preparing...' : 'Pickup Location'}</small>
                        </Popup>
                    </Marker>
                )}

                {/* 🏠 Customer Marker */}
                {customerPos.lat !== 0 && (
                    <Marker position={[customerPos.lat, customerPos.lng]} icon={makeDynamicCustomerIcon()}>
                        <Popup>
                            <strong>🏠 Your Delivery Location</strong>
                            <br /><small>Drop-off Point</small>
                        </Popup>
                    </Marker>
                )}

                {/* 🛵 Rider Marker — smoothly interpolated + rotated */}
                {displayPos && order?.orderStatus !== 'delivered' && (
                    <Marker
                        position={[displayPos.lat, displayPos.lng]}
                        icon={riderIcon}
                    >
                        <Popup>
                            <strong>🛵 {order?.rider?.name ?? 'Your Rider'}</strong>
                            <br /><small>Heading: {Math.round(riderHeading)}°</small>
                        </Popup>
                    </Marker>
                )}

                {/* Route Polyline (OSRM road-following) */}
                {routePoints.length > 0 && order?.orderStatus !== 'delivered' && (
                    <Polyline
                        positions={routePoints}
                        pathOptions={{
                            color: isPrePickup ? '#94a3b8' : '#f97316', // Gray line during prep, Orange when moving
                            weight: 5,
                            opacity: 0.8,
                            dashArray: isPrePickup ? '10,10' : undefined,
                        }}
                    />
                )}
            </MapContainer>

            {/* ── Live GPS Badge ── */}
            <div className={`absolute top-4 left-4 z-[1000] flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border ${displayPos ? 'border-orange-200' : 'border-slate-200'}`}>
                <div className={`w-2 h-2 rounded-full ${displayPos ? 'bg-orange-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">
                    {displayPos ? 'Live Rider GPS Active' : 'Rider Pending / Preparing'}
                </span>
            </div>

            {/* Free Map Badge */}
            <div className="absolute top-4 right-4 z-[1000] flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-full shadow-lg">
                <span className="text-[8px] font-black uppercase tracking-widest">🆓 Free Map</span>
            </div>

            {/* ── ETA / Distance Overlay ── */}
            {eta && order?.orderStatus !== 'delivered' && (
                <div className="absolute bottom-6 left-4 right-4 z-[1000]">
                    <div className="bg-slate-950/90 backdrop-blur-xl px-6 py-5 rounded-[2rem] shadow-2xl border border-white/10 flex justify-between items-center text-white">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 ${eta.phase === 'cooking' ? 'animate-pulse' : ''}`}>
                                <Clock className={eta.phase === 'cooking' ? 'text-slate-300' : 'text-orange-400'} size={22} />
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] mb-0.5">
                                    {eta.phase === 'cooking' ? 'Preparation + Transit Time' : (eta.phase === 'delivery' ? 'Arriving at your door' : 'Rider reaching restaurant')}
                                </p>
                                <p className={`text-2xl font-black leading-none ${eta.phase === 'cooking' ? 'text-slate-100' : 'text-orange-400'}`}>{eta.text}</p>
                            </div>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-slate-400 justify-end mb-0.5">
                                <MapPin size={10} />
                                <p className="text-[8px] font-black uppercase tracking-[0.2em]">
                                    {eta.phase === 'cooking' ? 'Rest. to You' : 'Remaining Distance'}
                                </p>
                            </div>
                            <p className="font-black text-white text-sm">{eta.distance}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
