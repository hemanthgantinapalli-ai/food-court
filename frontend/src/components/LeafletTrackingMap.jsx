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
// ─── Precision Tenali Coordinates (Reference Points) ────────────────────────
const LOCATIONS = {
    RESTAURANT: { lat: 16.2435, lng: 80.6480 }, // Ramalingeswara Pet (Center)
    CUSTOMER:   { lat: 16.2340, lng: 80.6550 }, // Chinaravuru (South-East)
    RIDER:      { lat: 16.2510, lng: 80.6390 }  // Sultanabad (North)
};
const TENALI_CENTER = LOCATIONS.RESTAURANT;

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

const makeRiderIcon = (heading = 0, etaMins = null) =>
    L.divIcon({
        className: '',
        html: `
            <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
                ${etaMins ? `
                    <div style="
                        background: #1e293b; 
                        color: white; 
                        padding: 4px 10px; 
                        border-radius: 8px; 
                        font-size: 10px; 
                        font-weight: 900; 
                        white-space: nowrap;
                        margin-bottom: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                        border: 1px solid rgba(255,255,255,0.1);
                        letter-spacing: 0.05em;
                    ">ETA : ${etaMins} MINS</div>
                ` : ''}
                <div style="
                    font-size:36px;
                    line-height:1;
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
                    transform: rotate(${heading}deg);
                    transition: transform 0.4s ease-out;
                ">🛵</div>
            </div>
        `,
        iconSize: [120, 80], // Large enough for the ETA label
        iconAnchor: [60, 70],
        popupAnchor: [0, -70],
    });

const restaurantIcon = makeIcon('🍽️', 40);
const customerIcon   = makeIcon('🏠', 36);

const makeDynamicRestaurantIcon = (status, imageUrl) => {
    const isPreparing = ['confirmed', 'preparing'].includes(status);
    const isReady = status === 'ready';
    
    // Status-based state indicators
    const borderColor = isPreparing ? '#f97316' : (isReady ? '#10b981' : '#f97316');
    const glowColor = isPreparing ? 'rgba(249,115,22,0.4)' : (isReady ? 'rgba(16,185,129,0.3)' : 'rgba(249,115,22,0.2)');
    
    // Fallback emoji if no image
    const fallbackEmoji = isPreparing ? '🥘' : (isReady ? '🛍️' : '🍳');
    
    const content = imageUrl 
        ? `<img src="${imageUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`
        : `<span style="font-size:24px;">${fallbackEmoji}</span>`;

    return L.divIcon({
        className: '',
        html: `
            <div style="position:relative; width: 62px; height: 75px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <svg width="62" height="75" viewBox="0 0 62 75" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute; top:0; left:0; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
                    <path d="M31 75L10 45C5 38 0 31 0 20C0 9 9 0 31 0C53 0 62 9 62 20C62 31 57 38 52 45L31 75Z" fill="white"/>
                    <path d="M31 71L12 43C7 36 2 30 2 20C2 10 10 2 31 2C52 2 60 10 60 20C60 30 55 36 50 43L31 71Z" fill="${borderColor}"/>
                </svg>
                <div class="${isPreparing ? 'animate-bounce' : ''}" style="
                    position:relative;
                    z-index:2;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background: white; 
                    border-radius: 50%; 
                    width: 46px;
                    height: 46px;
                    margin-top: -18px;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
                    overflow: hidden;
                ">${content}</div>
                ${isPreparing ? `<div style="position:absolute; top:-20px; background:white; color:${borderColor}; font-[900]; font-size:9px; padding:4px 8px; border-radius:8px; border:2px solid ${borderColor}; white-space:nowrap; box-shadow:0 4px 12px rgba(0,0,0,0.1); letter-spacing:0.05em;">PREPARING</div>` : ''}
            </div>
        `,
        iconSize: [62, 75],
        iconAnchor: [31, 75],
        popupAnchor: [0, -75],
    });
};

const makeDynamicCustomerIcon = () => {
    return L.divIcon({
        className: '',
        html: `
            <div style="position:relative; width: 44px; height: 54px; display: flex; align-items: center; justify-content: center;">
                <svg width="44" height="54" viewBox="0 0 44 54" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute; top:0; left:0; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
                    <path d="M22 54L7 32C3 27 0 22 0 14C0 6 6 0 22 0C38 0 44 6 44 14C44 22 41 27 37 32L22 54Z" fill="#1e293b"/>
                </svg>
                <div style="
                    position:relative;
                    z-index:2;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background: white; 
                    border-radius: 50%; 
                    width: 30px;
                    height: 30px;
                    margin-top: -16px;
                ">
                    <span style="font-size:18px;">🏠</span>
                </div>
            </div>
        `,
        iconSize: [44, 54],
        iconAnchor: [22, 54],
        popupAnchor: [0, -54],
    });
};

// ─── Constants ───────────────────────────────────────────────────────────────
const LERP_FACTOR    = 0.06; // Smoother and slower live follow
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
    const rest = order?.restaurant;
    const cust = order?.deliveryAddress;

    // Use order data if available, otherwise fall back to user's precision requested coordinates
    const restaurantPos = {
        lat: Number(rest?.location?.latitude || rest?.latitude || 0) || LOCATIONS.RESTAURANT.lat,
        lng: Number(rest?.location?.longitude || rest?.longitude || 0) || LOCATIONS.RESTAURANT.lng,
    };
    const customerPos = {
        lat: Number(cust?.latitude || cust?.lat || 0) || LOCATIONS.CUSTOMER.lat,
        lng: Number(cust?.longitude || cust?.lng || 0) || LOCATIONS.CUSTOMER.lng,
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

    useEffect(() => {
        let initPos = null;
        if (order?.riderLocation?.lat) {
            initPos = { lat: order.riderLocation.lat, lng: order.riderLocation.lng };
        } else if (order?.rider?.currentLocation?.latitude) {
            initPos = { lat: order.rider.currentLocation.latitude, lng: order.rider.currentLocation.longitude };
        } else if (isPickedUp) {
            // 📍 CRITICAL: If picked up, rider must be at restaurant
            initPos = restaurantPos;
        } else if (order?.rider) {
            // Priority Fallback: Sultanabad Hub for starting riders
            initPos = LOCATIONS.RIDER;
        }

        if (initPos && initPos.lat !== 0) {
            displayRef.current = initPos;
            targetRef.current  = initPos;
            setDisplayPos(initPos);
        }
        setMapReady(true);
    }, [order?.rider, order?.riderLocation, order?.orderStatus, restaurantPos.lat]);

    // ─── Socket: subscribe to live location updates ───────────────────────────
    useEffect(() => {
        if (!order?._id) return;

        const handleLocation = ({ orderId, lat, lng, heading, speed }) => {
            if (orderId !== order._id) return;
            if (!lat || !lng) return;

            const newTarget = { lat, lng };
            targetRef.current = newTarget;
            setRiderHeading(heading ?? 0);

            if (!displayRef.current) {
                displayRef.current = newTarget;
                setDisplayPos(newTarget);
            }

            // Restart LERP animation
            if (animRef.current) cancelAnimationFrame(animRef.current);
            animRef.current = requestAnimationFrame(animate);

            // 🚀 High-Frequency Route Sync during 'on_the_way'
            if (etaTimerRef.current) clearTimeout(etaTimerRef.current);
            const refreshInterval = order.orderStatus === 'on_the_way' ? 2000 : 8000;

            etaTimerRef.current = setTimeout(() => {
                const isGoingToCust = ['picked_up', 'on_the_way'].includes(order.orderStatus);
                fetchRoute(newTarget, isGoingToCust ? customerPos : restaurantPos, isGoingToCust ? 'delivery' : 'pickup');
            }, refreshInterval);
        };

        socket.on('updateRiderLocation', handleLocation);
        socket.on('rider_position_update', (data) => {
            if (data.riderId === order.rider?._id?.toString()) {
                handleLocation({ 
                    orderId: order._id, 
                    lat: data.location.lat, 
                    lng: data.location.lng, 
                    heading: data.heading, 
                    speed: data.speed 
                });
            }
        });

        return () => {
            socket.off('updateRiderLocation', handleLocation);
            socket.off('rider_position_update');
            if (animRef.current) cancelAnimationFrame(animRef.current);
            if (etaTimerRef.current) clearTimeout(etaTimerRef.current);
        };
    }, [order?._id, order?.rider, animate, fetchRoute, restaurantPos, customerPos]);

    // ─── Determine Route Logic When Component Mounts or Status Changes ────
    useEffect(() => {
        if (!mapReady || order?.orderStatus === 'delivered') return;

        const currentPos = displayRef.current || restaurantPos;
        if (isPickedUp) {
            // Phase 3: Rider -> Customer
            fetchRoute(currentPos, customerPos, 'delivery');
        } else if (hasRiderAssigned && displayPos) {
            // Phase 2: Rider -> Restaurant
            fetchRoute(currentPos, restaurantPos, 'pickup');
        } else {
            // Phase 1: No rider yet, show Restaurant -> Customer distance
            fetchRoute(restaurantPos, customerPos, 'cooking');
        }
    }, [order?.orderStatus, mapReady, hasRiderAssigned]);

    const riderIcon = makeRiderIcon(riderHeading, eta?.text?.split(' ')[0]);

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
                    <Marker position={[restaurantPos.lat, restaurantPos.lng]} icon={makeDynamicRestaurantIcon(order?.orderStatus, order?.restaurant?.image)}>
                        {['confirmed', 'preparing'].includes(order?.orderStatus) && (
                            <Popup minWidth={150} closeButton={false} autoPan={false}>
                                <div className="text-center font-black py-1">
                                    <p className="text-orange-600 text-[10px] uppercase tracking-widest mb-1">Chef is Cooking</p>
                                    <p className="text-slate-900 text-xs text-nowrap">🔥 Preparing your food</p>
                                </div>
                            </Popup>
                        )}
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
                {displayPos && (
                    <Marker
                        position={[displayPos.lat, displayPos.lng]}
                        icon={riderIcon}
                    >
                        <Popup>
                            <strong>🛵 {order?.rider?.name ?? 'Your Rider'}</strong>
                            <br /><small>{order?.orderStatus === 'delivered' ? 'Delivered successfully' : `Heading: ${Math.round(riderHeading)}°`}</small>
                        </Popup>
                    </Marker>
                )}

                {/* Route Polyline (Active Marching Ants Style) */}
                {routePoints.length > 0 && (
                    <Polyline
                        positions={routePoints}
                        pathOptions={{
                            color: order?.orderStatus === 'delivered' ? '#10b981' : '#3b82f6', 
                            weight: 6,
                            opacity: 0.9,
                            lineJoin: 'round',
                            lineCap: 'round',
                            dashArray: order?.orderStatus === 'delivered' ? null : '10, 10',
                            className: order?.orderStatus === 'delivered' ? '' : 'animate-marching-ants'
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
                                    {order?.orderStatus === 'picked_up' ? 'Rider at Restaurant - Order Checked' : 
                                     eta.phase === 'cooking' ? 'Preparation + Transit Time' : 
                                     (eta.phase === 'delivery' ? 'Arriving at your door' : 'Rider reaching restaurant')}
                                </p>
                                <p className={`text-2xl font-black leading-none ${eta.phase === 'cooking' ? 'text-slate-100' : 'text-orange-400'}`}>
                                    {order?.orderStatus === 'picked_up' ? 'READY' : eta.text}
                                </p>
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
