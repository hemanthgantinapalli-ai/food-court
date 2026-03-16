/**
 * LeafletRiderMap.jsx — FREE Rider Dashboard Map (Leaflet + OpenStreetMap + OSRM)
 *
 * Features:
 *  • 100% Free — No API key, no billing
 *  • Shows rider's own position, restaurant pin, customer pin
 *  • Road-following route via OSRM (already used for simulation in RiderDashboard)
 *  • Stage-aware: shows route to restaurant first, then to customer after pickup
 *  • Animated rider marker with heading rotation
 *  • ETA calculated from OSRM distance data
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

// Fix Leaflet default icon paths in bundlers
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const makeIcon = (emoji) =>
    L.divIcon({
        className: '',
        html: `<div style="font-size:36px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${emoji}</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -20],
    });

const makeRiderIcon = (heading = 0) =>
    L.divIcon({
        className: '',
        html: `<div style="
            font-size:38px;line-height:1;
            filter:drop-shadow(0 2px 6px rgba(249,115,22,0.7));
            transform:rotate(${heading}deg);
            transition:transform 0.4s ease-out;
        ">🛵</div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
        popupAnchor: [0, -22],
    });

const restIcon = makeIcon('🍽️');
const custIcon = makeIcon('🏠');

// Automatically fit map bounds to show all active markers
function FitBoundsToMarkers({ points }) {
    const map = useMap();
    useEffect(() => {
        const validPoints = points.filter(p => p && p.lat && p.lng);
        if (validPoints.length > 0) {
            const bounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lng]));
            // Add padding so markers aren't cut off at the edges
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

    const isPickedUp  = ['picked_up', 'on_the_way'].includes(orderStatus);
    const destination = isPickedUp ? customerPos : restaurantPos;

    const mapCenter = riderPos
        ?? restaurantPos
        ?? { lat: 17.385, lng: 78.4867 };

    // Fetch OSRM route whenever rider position or destination changes
    useEffect(() => {
        if (!riderPos?.lat || !destination?.lat) return;

        const key = `${riderPos.lat},${riderPos.lng}->${destination.lat},${destination.lng}`;
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
                    // ETA at 30km/h = (dist / 30) * 60 = dist * 2
                    const etaMins = Math.max(1, Math.round((distKm / 30) * 60));
                    setEta({ text: `${etaMins} min`, distance: `${distKm.toFixed(1)} km` });
                }
            } catch (e) {
                console.error('LeafletRiderMap route fetch failed:', e);
            }
        };

        fetchRoute();
    }, [riderPos?.lat, riderPos?.lng, destination?.lat, destination?.lng]);

    const riderIcon = makeRiderIcon(riderPos?.heading ?? 0);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={15}
                style={{ width: '100%', height: '100%' }}
                attributionControl={false}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Auto-fit bounds based on who is present */}
                <FitBoundsToMarkers points={[riderPos, restaurantPos, customerPos]} />

                {/* 🍽️ Restaurant */}
                {restaurantPos?.lat ? (
                    <Marker position={[restaurantPos.lat, restaurantPos.lng]} icon={restIcon}>
                        <Popup><strong>🍽️ Restaurant</strong><br /><small>Pickup point</small></Popup>
                    </Marker>
                ) : null}

                {/* 🏠 Customer */}
                {customerPos?.lat ? (
                    <Marker position={[customerPos.lat, customerPos.lng]} icon={custIcon}>
                        <Popup><strong>🏠 Customer Location</strong><br /><small>Drop-off point</small></Popup>
                    </Marker>
                ) : null}

                {/* 🛵 Rider */}
                {riderPos?.lat ? (
                    <Marker position={[riderPos.lat, riderPos.lng]} icon={riderIcon}>
                        <Popup><strong>🛵 You are here</strong></Popup>
                    </Marker>
                ) : null}

                {/* Road-following route */}
                {routePoints.length > 0 && (
                    <Polyline
                        positions={routePoints}
                        pathOptions={{ color: '#f97316', weight: 5, opacity: 0.85 }}
                    />
                )}
            </MapContainer>

            {/* ETA badge */}
            {eta && (
                <div style={{
                    position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 1000,
                    background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)',
                    borderRadius: 20, padding: '12px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    color: 'white', boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
                }}>
                    <div>
                        <p style={{ margin:0, fontSize:9, fontWeight:900, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.15em' }}>
                            {isPickedUp ? 'Deliver to Customer' : 'Head to Restaurant'}
                        </p>
                        <p style={{ margin:'4px 0 0', fontSize:22, fontWeight:900, color:'#fb923c', lineHeight:1 }}>{eta.text}</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                        <p style={{ margin:0, fontSize:9, fontWeight:900, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.15em' }}>Distance</p>
                        <p style={{ margin:'4px 0 0', fontSize:14, fontWeight:900, color:'white' }}>{eta.distance}</p>
                    </div>
                </div>
            )}

            {/* Free badge */}
            <div style={{
                position:'absolute', top:12, right:12, zIndex:1000,
                background:'#16a34a', color:'white',
                borderRadius:999, padding:'4px 10px',
                fontSize:9, fontWeight:900, letterSpacing:'0.1em',
                textTransform:'uppercase', boxShadow:'0 2px 8px rgba(0,0,0,0.2)',
            }}>🆓 Free GPS</div>
        </div>
    );
}
