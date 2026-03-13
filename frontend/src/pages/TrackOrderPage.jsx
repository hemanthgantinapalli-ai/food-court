import React, { useState, useEffect } from 'react';
import { MapPin, Package, Truck, CheckCircle, Clock, Phone, ChevronRight, AlertCircle, Loader2, Navigation, TrendingUp, ShieldCheck } from 'lucide-react';
import API from '../api/axios';
import { useAuthStore } from '../context/authStore';
import { useSearchParams, Link } from 'react-router-dom';
import { socket, connectSocket } from '../api/socket.js';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import marker2x from 'leaflet/dist/images/marker-icon-2x.png';
import marker from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default Leaflet markers in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: marker2x,
    iconUrl: marker,
    shadowUrl: markerShadow,
});

const riderIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44]
});

const restIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3004/3004458.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
});

const homeIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png',
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
});

// Smooth pan & Auto-zoom component
const MapUpdater = ({ center, allPoints = [] }) => {
    const map = useMap();
    
    useEffect(() => {
        if (center) {
            map.panTo(center, { animate: true, duration: 1.5 });
        }
    }, [center, map]);

    useEffect(() => {
        if (allPoints.length > 1) {
            const bounds = L.latLngBounds(allPoints);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [allPoints.length, map]);

    return null;
};

const STEPS = [
    { id: 'placed', label: 'Order Placed', icon: Package, desc: 'We have received your order' },
    { id: 'confirmed', label: 'Confirmed', icon: CheckCircle, desc: 'Restaurant is preparing' },
    { id: 'preparing', label: 'Preparing', icon: Clock, desc: 'Chef is cooking your meal' },
    { id: 'ready', label: 'Food Ready', icon: Package, desc: 'Waiting for rider pickup' },
    { id: 'picked_up', label: 'Picked Up', icon: Truck, desc: 'Rider is at restaurant' },
    { id: 'on_the_way', label: 'On the Way', icon: Navigation, desc: 'Rider heading to you' },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle, desc: 'Enjoy your delicious meal!' },
];

const STATUS_ORDER = ['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered'];

const haversineDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function TrackOrderPage() {
    const [orderIdSearch, setOrderIdSearch] = useState('');
    const [order, setOrder] = useState(null);
    const [searching, setSearching] = useState(false);
    const [searchParams] = useSearchParams();
    const { user } = useAuthStore();
    const [error, setError] = useState('');
    const [eta, setEta] = useState(null);

    const getRiderLocation = () => {
        // Priority 1: High-freq live tracking data from order (Updated via socket)
        if (order?.liveTracking?.lastLatitude) {
            return { latitude: order.liveTracking.lastLatitude, longitude: order.liveTracking.lastLongitude };
        }
        // Priority 2: Persistent rider location from rider profile
        if (order?.rider?.currentLocation?.latitude) {
            return order.rider.currentLocation;
        }
        // Priority 3: If order is picked up/on the way but no GPS yet, default to Restaurant!
        if ((order?.orderStatus === 'picked_up' || order?.orderStatus === 'on_the_way') && order?.restaurant?.location?.latitude) {
            return { latitude: order.restaurant.location.latitude, longitude: order.restaurant.location.longitude };
        }
        return null;
    };

    const riderLoc = getRiderLocation();

    useEffect(() => {
        const urlOrderId = searchParams.get('orderId');
        if (urlOrderId) {
            setOrderIdSearch(urlOrderId);
            handleExplicitTrack(urlOrderId);
            return;
        }

        const fetchLatestOrder = async () => {
            if (!user) return;
            setSearching(true);
            try {
                const response = await API.get('/orders/history');
                const history = response.data.data || response.data;
                if (history && history.length > 0) {
                    const latest = history[0];
                    setOrder(latest);
                    setOrderIdSearch(latest.orderId || latest._id);
                }
            } catch (err) {
                console.error('Error fetching latest order:', err);
            } finally {
                setSearching(false);
            }
        };
        fetchLatestOrder();

        if (user) {
            connectSocket(user._id);
            socket.on('order_status_update', (data) => {
                if (order && (data.orderId === order._id || data.orderId === order.orderId)) {
                    setOrder(prev => ({ ...prev, orderStatus: data.status }));
                }
            });

            socket.on('rider_location_updated', (data) => {
                // Maximum redundancy: check both ID types 
                const currentId = order?._id || '';
                const displayId = order?.orderId || '';

                if (data.orderId === currentId || data.orderId === displayId) {
                    setOrder(prev => ({
                        ...prev,
                        liveTracking: {
                            ...prev.liveTracking,
                            lastLatitude: data.location.lat,
                            lastLongitude: data.location.lng,
                            currentSpeed: data.speed,
                            bearing: data.heading
                        }
                    }));
                }
            });
        }

        return () => {
            socket.off('order_status_update');
            socket.off('rider_location_updated');
        };
    }, [user, searchParams, order?._id]);

    useEffect(() => {
        if (order?._id && user) {
            socket.emit('join_order', order._id);
        }
    }, [order?._id, user]);

    useEffect(() => {
        if (riderLoc?.latitude && order?.deliveryAddress?.latitude) {
            const dist = haversineDistance(
                riderLoc.latitude, riderLoc.longitude,
                order.deliveryAddress.latitude, order.deliveryAddress.longitude
            );
            const minutes = Math.max(2, Math.round((dist / 25) * 60)); // 25km/h avg
            setEta(minutes);
        }
    }, [riderLoc, order?.deliveryAddress]);

    // ── NEW: Road Routing logic (Phase-Aware) ──
    const [routePoints, setRoutePoints] = useState([]);
    const [routePhase, setRoutePhase] = useState('pickup');

    useEffect(() => {
        const fetchRoadRoute = async () => {
            if (!order?.restaurant?.location?.latitude || !order?.deliveryAddress?.latitude) return;
            
            // Logic: Is rider currently going to restaurant or customer?
            const isDeliveryPhase = ['picked_up', 'on_the_way'].includes(order.orderStatus);
            setRoutePhase(isDeliveryPhase ? 'delivery' : 'pickup');

            try {
                // Determine start and end based on current logistics phase
                const currentRider = getRiderLocation();
                const start = isDeliveryPhase ? 
                    (order.restaurant.location) : 
                    (currentRider || { lat: 16.2415, lng: 80.6480 }); // Fallback to hub
                
                const end = isDeliveryPhase ? 
                    order.deliveryAddress : 
                    order.restaurant.location;

                const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude || start.lng || start.lat},${start.latitude || start.lat || start.lng};${end.longitude || end.lng},${end.latitude || end.lat}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                const data = await res.json();
                
                if (data.routes?.[0]?.geometry?.coordinates) {
                    const sorted = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]); // [lat, lng]
                    setRoutePoints(sorted);
                }
            } catch (err) {
                console.error("OSRM Route Fetch Error:", err);
            }
        };
        fetchRoadRoute();
    }, [order?._id, order?.orderStatus, riderLoc?.latitude]); 
    // ──────────────────────────────────────────────

    const handleExplicitTrack = async (id) => {
        setSearching(true);
        setError('');
        try {
            const response = await API.get(`/orders/${id}`);
            setOrder(response.data.data);
        } catch (error) {
            setError('Searching for order...');
        } finally {
            setSearching(false);
        }
    };

    const handleTrack = async () => {
        const query = orderIdSearch.trim().toUpperCase();
        if (!query) return;
        setSearching(true);
        setError('');
        try {
            const response = await API.get(`/orders/${query}`);
            setOrder(response.data.data);
        } catch (error) {
            setError(error.response?.data?.message || 'Order not found');
            setOrder(null);
        } finally {
            setSearching(false);
        }
    };

    const currentStepIndex = order ? STATUS_ORDER.indexOf(order.orderStatus) : 0;
    const isDelivered = order?.orderStatus === 'delivered';

    return (
        <div className="bg-[#F8F9FB] min-h-screen">
            {/* Elegant Header */}
            <div className="bg-slate-950 py-16 px-6 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-orange-500/10 to-transparent opacity-30" />
                <span className="relative z-10 inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full mb-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Live Logistics Active
                </span>
                <h1 className="relative z-10 text-5xl md:text-7xl font-black text-white tracking-tighter mb-4 leading-tight">
                    Logistics <span className="text-orange-500">Tracking</span>
                </h1>
                <p className="relative z-10 text-slate-400 text-sm font-bold uppercase tracking-widest max-w-xl mx-auto opacity-60">
                    {routePhase === 'pickup' ? 'Rider heading to Restaurant' : 'Rider heading to Your Location'}
                </p>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-12 -mt-8 relative z-20">
                {/* Search / Refetch Box */}
                {!order || searching ? (
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200 border border-slate-100 mb-8 stagger-in">
                         <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Identify Your Shipment</label>
                         <div className="flex gap-4">
                            <input 
                                type="text"
                                value={orderIdSearch}
                                onChange={(e) => setOrderIdSearch(e.target.value)}
                                placeholder="Enter Order ID..."
                                className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-900 focus:bg-white focus:ring-4 focus:ring-orange-500/5 transition-all outline-none"
                            />
                            <button onClick={handleTrack} disabled={searching} className="bg-slate-950 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-slate-200">
                                {searching ? 'Searching...' : 'Search'}
                            </button>
                         </div>
                    </div>
                ) : (
                    <div className="flex justify-between items-center mb-8 px-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Tracking #{order.orderId || order._id.slice(-8)}</p>
                        </div>
                        <button onClick={() => setOrder(null)} className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline">New Track →</button>
                    </div>
                )}

                {order && (
                    <div className="space-y-8 animate-fade-up">
                        
                        {/* 1. Live Logistics Stats (Grid) */}
                        {!isDelivered && order.orderStatus !== 'placed' && (
                            <div className="grid grid-cols-3 gap-6">
                                {[
                                    { label: 'ETA', value: `${eta || '--'} MIN`, icon: Clock, color: 'text-orange-500' },
                                    { label: 'Distance', value: `${haversineDistance(riderLoc?.latitude, riderLoc?.longitude, order.deliveryAddress.latitude, order.deliveryAddress.longitude).toFixed(1)} KM`, icon: Navigation, color: 'text-blue-500' },
                                    { label: 'Rider Speed', value: '24 KM/H', icon: Truck, color: 'text-emerald-500' }
                                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
                        <stat.icon size={20} className={`${stat.color} mb-3`} />
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                        <p className="text-xl font-black text-slate-950">
                            {stat.label === 'Distance' ? (
                                riderLoc ? 
                                `${haversineDistance(riderLoc.latitude, riderLoc.longitude, order.deliveryAddress.latitude, order.deliveryAddress.longitude).toFixed(1)} KM` 
                                : '-- KM'
                            ) : stat.value}
                        </p>
                    </div>
                ))}
            </div>
        )}

                        {/* 2. Success Banner */}
                        {isDelivered && (
                            <div className="bg-gradient-to-br from-slate-950 to-slate-900 rounded-[2.5rem] p-12 text-center text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                                <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/40 rotate-12 transition-transform hover:rotate-0">
                                    <CheckCircle size={40} />
                                </div>
                                <h2 className="text-4xl font-black mb-3 tracking-tighter">Mission Accomplished!</h2>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Your meal has been delivered successfully.</p>
                                <div className="mt-10 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Rate your food experience</p>
                                     <div className="flex gap-2 text-2xl grayscale transition-all hover:grayscale-0 cursor-pointer">
                                        {['⭐','⭐','⭐','⭐','⭐'].map((s,i) => <span key={i} className="hover:scale-125 transition-transform">{s}</span>)}
                                     </div>
                                </div>
                            </div>
                        )}

                        {/* 3. High Fidelity Map */}
                        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 relative h-96 w-full z-0">
                            <MapContainer
                                key={order?._id || 'tracking-map'}
                                center={riderLoc ? [riderLoc.latitude, riderLoc.longitude] : (order?.restaurant?.location ? [order.restaurant.location.latitude, order.restaurant.location.longitude] : [16.2366, 80.6405])}
                                zoom={15}
                                className="h-full w-full"
                                zoomControl={false}
                            >
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                                
                                <MapUpdater 
                                    center={riderLoc ? [riderLoc.latitude, riderLoc.longitude] : null} 
                                    allPoints={[
                                        [order.deliveryAddress.latitude, order.deliveryAddress.longitude],
                                        order.restaurant?.location ? [order.restaurant.location.latitude, order.restaurant.location.longitude] : null,
                                        riderLoc ? [riderLoc.latitude, riderLoc.longitude] : null
                                    ].filter(Boolean)}
                                    routePoints={routePoints}
                                />
                                
                                {/* Home */}
                                <Marker position={[order.deliveryAddress.latitude, order.deliveryAddress.longitude]} icon={homeIcon}>
                                    <Popup>🏠 {isDelivered ? 'Delivered Here' : 'Destination: Tenali Chenchupet'}</Popup>
                                </Marker>

                                {/* Restaurant */}
                                {order.restaurant?.location && (
                                    <Marker position={[order.restaurant.location.latitude, order.restaurant.location.longitude]} icon={restIcon}>
                                        <Popup>🍳 {order.restaurant.name}</Popup>
                                    </Marker>
                                )}

                                {/* Rider */}
                                {!isDelivered && riderLoc?.latitude && (
                                    <Marker position={[riderLoc.latitude, riderLoc.longitude]} icon={riderIcon}>
                                        <Popup>
                                            <div className="p-1 min-w-[120px]">
                                                <p className="font-black text-slate-900 border-b border-slate-100 pb-1 mb-1 flex items-center gap-1.5">
                                                    🛵 {order.rider?.name || 'Santosh'}
                                                </p>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vehicle: <span className="text-slate-900">Bike</span></p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rating: <span className="text-orange-500">★ 4.5</span></p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Deliveries: <span className="text-slate-900">0</span></p>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )}

                                {/* Route Line (Road Accurate) */}
                                {(routePoints.length > 0 || (order.restaurant?.location && order.deliveryAddress)) && (
                                    <Polyline 
                                        positions={routePoints.length > 0 ? routePoints : [
                                            [order.restaurant.location?.latitude || 0, order.restaurant.location?.longitude || 0],
                                            [order.deliveryAddress.latitude, order.deliveryAddress.longitude]
                                        ]}
                                        color={isDelivered ? "#10b981" : "#f97316"} 
                                        weight={isDelivered ? 6 : 5} 
                                        dashArray={isDelivered ? "0" : "10, 15"} 
                                        opacity={isDelivered ? 0.9 : 0.4}
                                        lineCap="round"
                                        lineJoin="round"
                                    />
                                )}
                            </MapContainer>
                            <div className="absolute top-6 left-6 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isDelivered ? 'bg-emerald-500' : 'bg-orange-500 animate-ping'}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                                    {isDelivered ? 'Verified Journey' : 'Live Journey Tracking'}
                                </span>
                            </div>
                        </div>

                        {/* 4. Advanced Status Timeline */}
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100">
                             {/* 💎 NEW: Premium Dynamic ETA Dashboard */}
                             {!isDelivered && (
                                <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12 p-8 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">
                                            {routePhase === 'pickup' ? 'Procurement Phase' : 'Transit Phase'}
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black tracking-tighter text-orange-500">{eta || '12'}</span>
                                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Mins</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">
                                            {routePhase === 'pickup' ? `Reaching ${order.restaurant?.name || 'Kitchen'}` : 'Arriving at your door'}
                                        </p>
                                    </div>
                                    <div className="relative z-10 w-20 h-20 bg-white/5 rounded-[1.5rem] flex items-center justify-center border border-white/10 group-hover:bg-orange-500 transition-colors duration-500">
                                        <Clock size={40} className="text-orange-500 group-hover:text-white transition-colors" />
                                    </div>
                                    <TrendingUp className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 opacity-50 group-hover:scale-110 transition-transform duration-1000" />
                                </div>
                             )}

                             <div className="flex items-center justify-between mb-12">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Delivery Journey</h3>
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Insurance Active</span>
                                </div>
                             </div>

                             <div className="relative">
                                 {/* Full Length Static Gray Line */}
                                 <div className="absolute left-[20px] top-0 bottom-0 w-0.5 bg-slate-50" />
                                 {/* Dynamic Growing Orange Line */}
                                 <div 
                                    className="absolute left-[20px] top-0 w-0.5 bg-orange-500 transition-all duration-1000 ease-in-out" 
                                    style={{ height: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
                                 />

                                 <div className="space-y-12 relative">
                                    {STEPS.map((step, index) => {
                                        const isCompleted = index <= currentStepIndex;
                                        const isCurrent = index === currentStepIndex;

                                        return (
                                            <div key={step.id} className={`flex items-start gap-8 transition-opacity duration-700 ${isCompleted ? 'opacity-100' : 'opacity-20'}`}>
                                                <div className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${isCompleted ? 'bg-orange-500 text-white shadow-2xl shadow-orange-500/30' : 'bg-slate-100 text-slate-400'}`}>
                                                    <step.icon size={18} />
                                                    {isCurrent && !isDelivered && (
                                                        <span className="absolute -inset-1 rounded-[1.25rem] border-2 border-orange-500/20 animate-pulse" />
                                                    )}
                                                </div>
                                                <div className="flex-1 pt-1">
                                                    <div className="flex items-center gap-3">
                                                       <p className={`text-sm font-black uppercase tracking-widest ${isCompleted ? 'text-slate-950' : 'text-slate-400'}`}>{step.label}</p>
                                                       {isCurrent && !isDelivered && (
                                                           <span className="bg-orange-50 text-orange-600 text-[8px] font-black px-2 py-0.5 rounded-lg border border-orange-100 animate-pulse tracking-widest">ACTIVE</span>
                                                       )}
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-tight">{step.desc}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                 </div>
                             </div>
                        </div>

                        {/* 5. Order & Delivery Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             {/* Order Profile */}
                             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Consignment Details</p>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-50 pb-2 mb-2">
                                         <span className="text-xs font-bold text-slate-500">Destination</span>
                                         <span className="text-[10px] font-black text-slate-950 text-right uppercase tracking-tighter">Tenali Chenchupet, 522201</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                         <span className="text-xs font-bold text-slate-500">Amount Paid</span>
                                         <span className="text-lg font-black text-slate-950">₹{order.total}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                         <span className="text-xs font-bold text-slate-500">Total Items</span>
                                         <span className="text-sm font-black text-slate-900">{order.items.reduce((a,b) => a + b.quantity, 0)} Units</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                         <span className="text-xs font-bold text-slate-500">Partner Store</span>
                                         <span className="text-sm font-black text-orange-600">{order.restaurant?.name || 'Restaurant'}</span>
                                    </div>
                                </div>
                             </div>

                             {/* Contact Hub */}
                             {order.rider && !isDelivered ? (
                                <div className="bg-slate-950 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <TrendingUp size={80} className="text-white" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6">Logistics Partner</p>
                                    <div className="flex items-center gap-5 mb-8">
                                        <div className="w-16 h-16 bg-slate-800 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center font-black text-2xl text-white">
                                            {order.rider.profilePhoto ? <img src={order.rider.profilePhoto} className="w-full h-full object-cover" /> : '🚴'}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-black text-white text-lg">{order.rider?.name || 'Santosh'}</h4>
                                            <div className="flex items-center gap-3">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Courier Partner</p>
                                                <div className="flex items-center gap-1 text-orange-500">
                                                    <span className="text-[10px] font-black">★ 4.5</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => alert(`Calling ${order.rider?.name || 'Santosh'}...`)}
                                            className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <Phone size={20} />
                                        </button>
                                    </div>
                                    
                                    {!isDelivered && (
                                        <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden group">
                                            <div className="relative z-10 flex justify-between items-center">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Delivery PIN</p>
                                                    <p className="text-3xl font-black text-orange-500 tracking-tighter">
                                                        {order._id?.slice(-4).toUpperCase() || '7429'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Status</p>
                                                    <p className="text-xs font-black text-white uppercase tracking-widest">Share with Rider</p>
                                                </div>
                                            </div>
                                            <ShieldCheck className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 -rotate-12 group-hover:scale-110 transition-transform duration-700" />
                                        </div>
                                    )}
                                </div>
                             ) : (
                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                                        <Truck size={24} />
                                    </div>
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Awaiting Assignment</p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">Our system is selecting the best rider for you.</p>
                                </div>
                             )}
                        </div>

                    </div>
                )}
            </div>
            
            {/* Global Animations Style */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up {
                    animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .stagger-in {
                    animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}} />
        </div>
    );
}
