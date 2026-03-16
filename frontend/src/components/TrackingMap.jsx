/**
 * TrackingMap.jsx — Google Maps Live Tracking Component
 *
 * Features:
 *  • Three markers: Restaurant 🍳, Customer 🏠, Rider 🛵
 *  • Smooth rider icon movement via requestAnimationFrame LERP interpolation
 *  • Rotating rider icon based on heading/bearing
 *  • Live ETA from Google Distance Matrix API (debounced, every ~5s)
 *  • Route polyline (DirectionsService) from rider → destination
 *  • Socket.io subscription for real-time location updates
 *  • Order-status-aware: route flips from restaurant → customer on pickup
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    Map,
    AdvancedMarker,
    useMap,
    InfoWindow,
} from '@vis.gl/react-google-maps';
import { socket } from '../api/socket';
import { Clock, Navigation, Zap, MapPin } from 'lucide-react';
import Directions from './Directions';


// ─── Constants ───────────────────────────────────────────────────────────────

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const MAP_OPTIONS = {
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
};

const ROUTE_OPTIONS = {
    suppressMarkers: true,
    polylineOptions: {
        strokeColor: '#f97316',
        strokeWeight: 5,
        strokeOpacity: 0.7,
    },
};

const LERP_FACTOR   = 0.07; // Smoothing coefficient — lower = smoother but slower
const ETA_DEBOUNCE  = 5000; // ms between Distance Matrix calls
const DIST_THRESHOLD = 0.00001; // ~1m — stop animating when this close

// ─── Component ────────────────────────────────────────────────────────────────
const PanToCenter = ({ displayPos }) => {
    const map = useMap();
    useEffect(() => {
        if (!map || !displayPos) return;
        map.panTo(displayPos);
    }, [map, displayPos]);
    return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @param {object} order          - Populated order object from API (includes restaurant, deliveryAddress, rider, liveTracking)
 * @param {boolean} isGoogleReady - From useJsApiLoader().isLoaded
 */
export default function TrackingMap({ order, isGoogleReady }) {
    const mapRef     = useRef(null);
    const animRef    = useRef(null);   // requestAnimationFrame id
    const displayRef = useRef(null);   // { lat, lng } currently rendered
    const targetRef  = useRef(null);   // { lat, lng } latest socket target
    const etaTimerRef = useRef(null);  // debounce timer for Distance Matrix

    const [displayPos, setDisplayPos]   = useState(null);     // rendered rider position
    const [riderHeading, setRiderHeading] = useState(0);       // degrees
    const [directions, setDirections]   = useState(null);      // DirectionsResult
    const [eta, setEta]                 = useState(null);      // { text, seconds, distance }
    const [selectedMarker, setSelectedMarker] = useState(null);// 'restaurant'|'home'|'rider'

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

    const isPickedUp = ['picked_up', 'on_the_way', 'delivered'].includes(order?.orderStatus);
    const destination = isPickedUp ? customerPos : restaurantPos;

    // ─── Animation loop (LERP) ────────────────────────────────────────────────

    const animate = useCallback(() => {
        if (!displayRef.current || !targetRef.current) return;

        const cur = displayRef.current;
        const tgt = targetRef.current;

        const newLat = cur.lat + (tgt.lat - cur.lat) * LERP_FACTOR;
        const newLng = cur.lng + (tgt.lng - cur.lng) * LERP_FACTOR;
        displayRef.current = { lat: newLat, lng: newLng };
        setDisplayPos({ lat: newLat, lng: newLng });

        const dist = Math.abs(newLat - tgt.lat) + Math.abs(newLng - tgt.lng);
        if (dist > DIST_THRESHOLD) {
            animRef.current = requestAnimationFrame(animate);
        }
    }, []);

    // ─── Google Distance Matrix ETA ───────────────────────────────────────────

    const calculateETA = useCallback((riderPos, dest) => {
        if (!window.google || !riderPos || !dest.lat) return;

        const service = new window.google.maps.DistanceMatrixService();
        service.getDistanceMatrix(
            {
                origins:      [{ lat: riderPos.lat, lng: riderPos.lng }],
                destinations: [{ lat: dest.lat,      lng: dest.lng      }],
                travelMode:   'DRIVING',
                unitSystem:   window.google.maps.UnitSystem.METRIC,
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: 'bestguess',
                },
            },
            (result, status) => {
                if (status === 'OK') {
                    const el = result.rows[0].elements[0];
                    if (el.status === 'OK') {
                        setEta({
                            text:     el.duration_in_traffic?.text     ?? el.duration.text,
                            seconds:  el.duration_in_traffic?.value    ?? el.duration.value,
                            distance: el.distance.text,
                        });
                    }
                }
            }
        );
    }, []);

    // ─── Google Directions (road route) ──────────────────────────────────────

    const fetchDirections = useCallback((origin, dest) => {
        if (!window.google || !origin?.lat || !dest?.lat) return;

        const service = new window.google.maps.DirectionsService();
        service.route(
            {
                origin:      origin,
                destination: dest,
                travelMode:  window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === 'OK') setDirections(result);
            }
        );
    }, []);

    // ─── Initialize from DB persisted location ────────────────────────────────

    useEffect(() => {
        let initPos = null;

        if (order?.liveTracking?.lastLatitude) {
            initPos = {
                lat: order.liveTracking.lastLatitude,
                lng: order.liveTracking.lastLongitude,
            };
        } else if (order?.rider?.currentLocation?.latitude) {
            initPos = {
                lat: order.rider.currentLocation.latitude,
                lng: order.rider.currentLocation.longitude,
            };
        }

        if (initPos) {
            displayRef.current = initPos;
            targetRef.current  = initPos;
            setDisplayPos(initPos);
        }
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

            // Initialise displayRef on first update
            if (!displayRef.current) {
                displayRef.current = newTarget;
                setDisplayPos(newTarget);
            }

            // Restart animation loop
            if (animRef.current) cancelAnimationFrame(animRef.current);
            animRef.current = requestAnimationFrame(animate);

            // Debounced ETA recalculation
            if (etaTimerRef.current) clearTimeout(etaTimerRef.current);
            etaTimerRef.current = setTimeout(() => {
                calculateETA(newTarget, destination);
            }, ETA_DEBOUNCE);
        };

        socket.on('rider_location_updated', handleLocation);
        socket.on('rider_position_update',  (data) => {
            // Fallback: admin-style event referencing riderId
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
    }, [order?._id, order?.rider, animate, calculateETA, destination]);

    // ─── Re-fetch directions when rider position or status changes ────────────

    useEffect(() => {
        if (!isGoogleReady || !displayPos) return;
        fetchDirections(displayPos, destination);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGoogleReady, order?.orderStatus, displayPos?.lat]);



    // ─── Map center ───────────────────────────────────────────────────────────

    const mapCenter = displayPos ?? restaurantPos;

    if (!isGoogleReady) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50 rounded-[2.5rem]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Loading Map…
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden">
            {/* ── Google Map ── */}
            <Map
                defaultZoom={15}
                defaultCenter={mapCenter}
                options={MAP_OPTIONS}
                mapId="DEMO_MAP_ID"
                gestureHandling={'greedy'}
            >
                <PanToCenter displayPos={displayPos} />
                
                {/* 🍳 Restaurant Marker */}
                {restaurantPos.lat !== 0 && (
                    <AdvancedMarker
                        position={restaurantPos}
                        onClick={() => setSelectedMarker('restaurant')}
                        zIndex={10}
                    >
                        <img src="https://cdn-icons-png.flaticon.com/512/3448/3448609.png" style={{width: 42, height: 42}} alt="restaurant" />
                    </AdvancedMarker>
                )}
                {selectedMarker === 'restaurant' && (
                    <InfoWindow position={restaurantPos} onCloseClick={() => setSelectedMarker(null)}>
                        <div className="p-1 min-w-[120px]">
                            <p className="font-black text-slate-900">🍳 {order?.restaurant?.name}</p>
                            <p className="text-[10px] text-slate-500 mt-1">Pickup Location</p>
                        </div>
                    </InfoWindow>
                )}

                {/* 🏠 Customer / Drop Marker */}
                {customerPos.lat !== 0 && (
                    <AdvancedMarker
                        position={customerPos}
                        onClick={() => setSelectedMarker('home')}
                        zIndex={10}
                    >
                        <img src="https://cdn-icons-png.flaticon.com/512/1077/1077114.png" style={{width: 38, height: 38}} alt="home" />
                    </AdvancedMarker>
                )}
                {selectedMarker === 'home' && (
                    <InfoWindow position={customerPos} onCloseClick={() => setSelectedMarker(null)}>
                        <div className="p-1 min-w-[120px]">
                            <p className="font-black text-slate-900">🏠 Your Location</p>
                            <p className="text-[10px] text-slate-500 mt-1">Delivery Destination</p>
                        </div>
                    </InfoWindow>
                )}

                {/* 🛵 Rider Marker — smooth interpolated + rotated */}
                {displayPos && order?.orderStatus !== 'delivered' && (
                    <AdvancedMarker
                        position={displayPos}
                        onClick={() => setSelectedMarker('rider')}
                        zIndex={20}
                    >
                         <div style={{ transform: `rotate(${riderHeading}deg)`, transition: 'transform 0.4s ease-out' }}>
                             <img src="https://cdn-icons-png.flaticon.com/512/3063/3063822.png" style={{width: 40, height: 40}} alt="rider" />
                         </div>
                    </AdvancedMarker>
                )}
                {selectedMarker === 'rider' && displayPos && (
                    <InfoWindow position={displayPos} onCloseClick={() => setSelectedMarker(null)}>
                        <div className="p-1 min-w-[130px]">
                            <p className="font-black text-slate-900">🛵 {order?.rider?.name ?? 'Your Rider'}</p>
                            <p className="text-[10px] text-emerald-600 font-bold mt-1">Heading: {Math.round(riderHeading)}°</p>
                        </div>
                    </InfoWindow>
                )}

                {/* Route Polyline via Directions API */}
                {directions && (
                    <Directions
                        directions={directions}
                    />
                )}
            </Map>

            {/* ── Live Tracking Badge ── */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white">
                <div className={`w-2 h-2 rounded-full ${displayPos ? 'bg-orange-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">
                    {displayPos ? 'Live GPS Active' : 'Awaiting GPS…'}
                </span>
            </div>

            {/* ── ETA / Distance Overlay ── */}
            {eta && displayPos && order?.orderStatus !== 'delivered' && (
                <div className="absolute bottom-6 left-4 right-4 z-10">
                    <div className="bg-slate-950/90 backdrop-blur-xl px-6 py-5 rounded-[2rem] shadow-2xl border border-white/10 flex justify-between items-center text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                                <Clock className="text-orange-400" size={22} />
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] mb-0.5">
                                    {isPickedUp ? 'Arriving at your door' : 'Reaching restaurant'}
                                </p>
                                <p className="text-2xl font-black text-orange-400 leading-none">
                                    {eta.text}
                                </p>
                            </div>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
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
        </div>
    );
}
