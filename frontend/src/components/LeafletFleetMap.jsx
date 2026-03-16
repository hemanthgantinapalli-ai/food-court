/**
 * LeafletFleetMap.jsx — FREE Admin Fleet Map (Leaflet + OpenStreetMap)
 *
 * Features:
 *  • 100% Free — No API key, no billing
 *  • Live rider markers with rotation based on heading
 *  • Click on rider to see popup with name, speed, status
 *  • Auto-fits bounds to show all online riders
 *  • Real-time marker position updates as socket events come in
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
} from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon paths
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

// Create a rider icon rotated per heading
const makeRiderIcon = (heading = 0, speed = 0) =>
    L.divIcon({
        className: '',
        html: `<div style="
            display:flex; flex-direction:column; align-items:center;
        ">
            <div style="
                font-size:34px;
                line-height:1;
                transform: rotate(${heading}deg);
                transition: transform 0.6s ease-out;
                filter: drop-shadow(0 2px 6px rgba(249,115,22,0.6));
            ">🛵</div>
            ${speed > 0 ? `<div style="
                background:#f97316; color:white;
                font-size:9px; font-weight:900;
                padding: 1px 5px; border-radius:999px;
                margin-top:2px; letter-spacing:0.05em;
                white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,0.2);
            ">${Math.round(speed)} km/h</div>` : ''}
        </div>`,
        iconSize: [48, speed > 0 ? 56 : 40],
        iconAnchor: [24, speed > 0 ? 28 : 20],
        popupAnchor: [0, speed > 0 ? -56 : -40],
    });

// ─── Auto-fit bounds when riders list changes ─────────────────────────────────
function FitBoundsOnRiders({ riders }) {
    const map = useMap();
    useEffect(() => {
        const withLoc = riders.filter(r => r.location?.lat);
        if (!map || withLoc.length === 0) return;

        if (withLoc.length === 1) {
            map.setView([withLoc[0].location.lat, withLoc[0].location.lng], 15, { animate: true });
            return;
        }

        const bounds = L.latLngBounds(withLoc.map(r => [r.location.lat, r.location.lng]));
        map.fitBounds(bounds, { padding: [60, 60], animate: true });
    }, [map, riders]);
    return null;
}

// ─── Default center (India) ───────────────────────────────────────────────────
const DEFAULT_CENTER = [20.5937, 78.9629];

export default function LeafletFleetMap({ riders = [] }) {
    const [selectedRider, setSelectedRider] = useState(null);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <MapContainer
                center={DEFAULT_CENTER}
                zoom={5}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
                attributionControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

                <FitBoundsOnRiders riders={riders} />

                {riders.map((rider) =>
                    rider.location?.lat ? (
                        <Marker
                            key={rider._id || rider.userId}
                            position={[rider.location.lat, rider.location.lng]}
                            icon={makeRiderIcon(rider.heading || 0, rider.speed || 0)}
                            eventHandlers={{ click: () => setSelectedRider(rider) }}
                        >
                            <Popup>
                                <div style={{ minWidth: 170 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, paddingBottom:8, borderBottom:'1px solid #f1f5f9' }}>
                                        <div style={{ fontSize:24 }}>🚴</div>
                                        <div>
                                            <p style={{ margin:0, fontWeight:900, color:'#0f172a', fontSize:13 }}>{rider.name}</p>
                                            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                                                <div style={{ width:7, height:7, borderRadius:'50%', background: rider.speed > 0 ? '#22c55e' : '#f59e0b' }} />
                                                <p style={{ margin:0, fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                                                    {rider.speed > 0 ? 'In Motion' : 'Stationary'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                                        <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase' }}>Speed</span>
                                        <span style={{ fontSize:10, fontWeight:900, color:'#0f172a' }}>{Math.round(rider.speed || 0)} KM/H</span>
                                    </div>
                                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                                        <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase' }}>Heading</span>
                                        <span style={{ fontSize:10, fontWeight:900, color:'#0f172a' }}>{Math.round(rider.heading || 0)}°</span>
                                    </div>
                                    <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid #f1f5f9', textAlign:'center' }}>
                                        <span style={{ fontSize:9, fontWeight:900, color:'#22c55e', textTransform:'uppercase', letterSpacing:'0.1em' }}>ONLINE</span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ) : null
                )}
            </MapContainer>
        </div>
    );
}
