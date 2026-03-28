/**
 * LeafletFleetMap.jsx — FREE Admin Fleet Map (Leaflet + OpenStreetMap)
 *
 * HYPER-REALISTIC VERSION:
 *  • Smooth Interpolated Movement (no jumps)
 *  • Neon Breadcrumb Trails (path history)
 *  • Live Radar Pulse & Glassmorphic UI
 *  • 100% Free — No API key, no billing
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
    Polyline,
} from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon paths
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

// ─── ADD STYLES FOR ANIMATIONS ────────────────────────────────────────────────
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
        background: rgba(249, 115, 22, 0.4);
        border-radius: 50%;
        animation: radar-pulse 2s infinite ease-out;
        pointer-events: none;
    }
    .leaflet-marker-icon {
        transition: transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1);
    }
`;
document.head.appendChild(styleTag);

// ─── HIGH-FIDELITY RIDER ICON ───────────────────────────────────────────────
const makeRiderIcon = (heading = 0, speed = 0, isSelected = false) =>
    L.divIcon({
        className: 'custom-rider-icon',
        html: `
            <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
                ${speed > 0 ? '<div class="radar-pulse-ring"></div>' : ''}
                <div style="
                    font-size:${isSelected ? '44px' : '36px'};
                    line-height:1;
                    transform: rotate(${heading}deg);
                    transition: transform 0.6s ease-out, font-size 0.3s ease;
                    filter: drop-shadow(0 0 12px rgba(249,115,22,${speed > 0 ? '0.8' : '0.4'}));
                    z-index: 2;
                ">🛵</div>
                ${speed > 0 ? `
                <div style="
                    background:rgba(15, 23, 42, 0.9); 
                    backdrop-filter: blur(8px);
                    color:white;
                    font-size:8px; font-weight:900;
                    padding: 2px 6px; border-radius:6px;
                    margin-top:4px; letter-spacing:0.05em;
                    white-space:nowrap; border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                ">${Math.round(speed)} KM/H</div>` : ''}
            </div>
        `,
        iconSize: [60, 80],
        iconAnchor: [30, 40],
        popupAnchor: [0, -40],
    });

// ─── SMOOTHED MARKER COMPONENT ──────────────────────────────────────────────
// Interpolates real-time position updates for a "gliding" effect
function SmoothedRider({ rider, isSelected, onClick, activeOrder }) {
    const [pos, setPos] = useState([rider.location.lat, rider.location.lng]);
    const prevPos = useRef([rider.location.lat, rider.location.lng]);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const newPos = [rider.location.lat, rider.location.lng];
        if (newPos[0] !== prevPos.current[0] || newPos[1] !== prevPos.current[1]) {
            setPos(newPos);
            setHistory(prev => [newPos, ...prev].slice(0, 5)); // Keep last 5 points for breadcrumbs
            prevPos.current = newPos;
        }
    }, [rider.location.lat, rider.location.lng]);

    // Calculate active routing destination if on a mission
    const currentStatus = (activeOrder?.orderStatus || '').toLowerCase();
    const isGoingToRest = activeOrder && ['assigned', 'arrived'].includes(currentStatus);
    const targetRouteRaw = activeOrder ? (
        isGoingToRest ? 
           [activeOrder.restaurant?.location?.latitude || activeOrder.restaurantLocation?.latitude, activeOrder.restaurant?.location?.longitude || activeOrder.restaurantLocation?.longitude] 
           : 
        ['picked up', 'picked_up', 'on_the_way', 'ready'].includes(currentStatus) ?
           [activeOrder.deliveryAddress?.latitude, activeOrder.deliveryAddress?.longitude]
           : null
    ) : null;
    const validTargetRow = targetRouteRaw && targetRouteRaw[0] && targetRouteRaw[1] ? [Number(targetRouteRaw[0]), Number(targetRouteRaw[1])] : null;

    return (
        <>
            {/* Breadcrumb Trail */}
            {history.length > 1 && (
                <Polyline 
                    positions={history} 
                    pathOptions={{ 
                        color: '#f97316', 
                        weight: 2, 
                        opacity: 0.4, 
                        dashArray: '5, 10',
                        lineCap: 'round'
                    }} 
                />
            )}

            {/* Active Order Routing Line */}
            {validTargetRow && (
                <>
                    <Polyline 
                        positions={[pos, validTargetRow]} 
                        pathOptions={{ 
                            color: isGoingToRest ? '#3b82f6' : '#10b981', 
                            weight: 3, 
                            opacity: 0.8, 
                            dashArray: '10, 10',
                            lineCap: 'round'
                        }} 
                    />
                    <Marker 
                        position={validTargetRow} 
                        icon={L.divIcon({
                            className: 'destination-icon',
                            html: `<div style="font-size: 24px; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));">${isGoingToRest ? '🏪' : '📍'}</div>`,
                            iconSize: [24, 24],
                            iconAnchor: [12, 24]
                        })}
                    >
                         <Popup>
                              <div style={{fontWeight: 'bold', fontSize: '10px'}}>{isGoingToRest ? 'Pickup: ' + (activeOrder.restaurant?.name || 'Restaurant') : 'Dropoff: ' + (activeOrder.customer?.name || 'Customer')}</div>
                         </Popup>
                    </Marker>
                </>
            )}
            
            <Marker
                position={pos}
                icon={makeRiderIcon(rider.heading || 0, rider.speed || 0, isSelected)}
                eventHandlers={{ click: onClick }}
            >
                <Popup className="premium-popup">
                    <div style={{ minWidth: 200, padding: '4px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, paddingBottom:12, borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ width:40, height:40, background:'#f97316', borderRadius:12, display:'flex', alignItems:'center', justifyCenter:'center', fontSize:20, color:'white', boxShadow:'0 4px 12px rgba(249,115,22,0.3)' }}>
                                <span style={{margin:'auto'}}>🚴</span>
                            </div>
                            <div style={{flex:1}}>
                                <p style={{ margin:0, fontWeight:900, color:'#0f172a', fontSize:14, letterSpacing:'-0.02em' }}>{rider.name}</p>
                                <p style={{ margin:0, fontSize:9, fontWeight:800, color: rider.speed > 0 ? '#10b981' : '#f59e0b', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                                    {rider.speed > 0 ? '• In Transit' : '• Resting'}
                                </p>
                            </div>
                        </div>
                        
                        <div style={{ background:'rgba(241, 245, 249, 0.5)', borderRadius:12, padding:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                            <div>
                                <p style={{ margin:0, fontSize:8, fontWeight:700, color:'#94a3b8', textTransform:'uppercase' }}>Velocity</p>
                                <p style={{ margin:0, fontSize:12, fontWeight:900, color:'#0f172a' }}>{Math.round(rider.speed || 0)} <span style={{fontSize:8}}>KM/H</span></p>
                            </div>
                            <div>
                                <p style={{ margin:0, fontSize:8, fontWeight:700, color:'#94a3b8', textTransform:'uppercase' }}>Bearing</p>
                                <p style={{ margin:0, fontSize:12, fontWeight:900, color:'#0f172a' }}>{Math.round(rider.heading || 0)}°</p>
                            </div>
                        </div>

                        <div style={{ marginTop:12, textAlign:'center' }}>
                            <span style={{ fontSize:8, fontWeight:900, color:'#10b981', textTransform:'uppercase', letterSpacing:'0.2em', background:'rgba(16, 185, 129, 0.1)', padding:'4px 10px', borderRadius:20 }}>
                                Live Encrypted Signal
                            </span>
                        </div>
                    </div>
                </Popup>
            </Marker>
        </>
    );
}

// ─── AUTO-FIT BOUNDS ───────────────────────────────────────────────────────
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
        map.fitBounds(bounds, { padding: [100, 100], animate: true });
    }, [map, riders]);
    return null;
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
const DEFAULT_CENTER = [20.5937, 78.9629];

export default function LeafletFleetMap({ riders = [], activeOrders = [] }) {
    const [selectedId, setSelectedId] = useState(null);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <MapContainer
                center={DEFAULT_CENTER}
                zoom={5}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
                attributionControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; OpenStreetMap &copy; CARTO'
                />

                <FitBoundsOnRiders riders={riders} />

                {riders.map((rider) => {
                    if (!rider.location?.lat) return null;
                    const assignedOrder = activeOrders.find(o => {
                        const orderRiderId = (o.rider?._id || o.rider || '').toString();
                        const riderId = (rider.userId || rider._id || '').toString();
                        return orderRiderId === riderId && orderRiderId !== '';
                    });
                    
                    return (
                        <SmoothedRider 
                            key={rider._id || rider.userId} 
                            rider={rider} 
                            activeOrder={assignedOrder}
                            isSelected={selectedId === (rider._id || rider.userId)}
                            onClick={() => setSelectedId(rider._id || rider.userId)}
                        />
                    );
                })}
            </MapContainer>
            
            {/* Legend / Overlay */}
            <div style={{ 
                position: 'absolute', 
                bottom: 20, 
                right: 20, 
                zIndex: 1000, 
                background: 'rgba(255,255,255,0.8)', 
                backdropFilter: 'blur(12px)',
                padding: '12px 18px',
                borderRadius: '20px',
                border: '1px solid white',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, background: '#f97316', borderRadius: '50%', boxShadow: '0 0 8px #f97316' }}></div>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active Courier</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 2, background: '#f97316', opacity: 0.4, border: '1px dashed #f97316' }}></div>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent Path</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 3, background: '#3b82f6', border: '1px dashed #3b82f6' }}></div>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>To Restaurant</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 3, background: '#10b981', border: '1px dashed #10b981' }}></div>
                    <span style={{ fontSize: 10, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>To Customer</span>
                </div>
            </div>
        </div>
    );
}
