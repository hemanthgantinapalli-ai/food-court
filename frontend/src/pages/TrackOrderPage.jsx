import React, { useState, useEffect } from 'react';
import { MapPin, Package, Truck, CheckCircle, Clock, Phone, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import API from '../api/axios';
import { useAuthStore } from '../context/authStore';
import { useSearchParams, Link } from 'react-router-dom';
import { socket, connectSocket, disconnectSocket } from '../api/socket.js';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
});

const restIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3004/3004458.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
});

const STATUS_MAPPING = {
    'placed': 0,
    'confirmed': 0,
    'preparing': 1,
    'ready': 2,
    'on_the_way': 3,
    'delivered': 4,
    'cancelled': -1
};

const STEPS = [
    { label: 'Placed', icon: CheckCircle, desc: 'Wait for confirmation' },
    { label: 'Preparing', icon: Clock, desc: 'Chef is cooking your meal' },
    { label: 'Ready', icon: Package, desc: 'Food is ready and waiting for a rider' },
    { label: 'On the Way', icon: Truck, desc: 'Rider is on the way to you' },
    { label: 'Delivered', icon: CheckCircle, desc: 'Order delivered successfully!' },
];

const COUPON_CODES = ['PIZZA40', 'FIRST50', 'FREEDEL', 'WEEKEND30', 'SUSHI25', 'COMBO199'];

export default function TrackOrderPage() {
    const [orderIdSearch, setOrderIdSearch] = useState('');
    const [order, setOrder] = useState(null);
    const [searching, setSearching] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuthStore();
    const [error, setError] = useState('');

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

        // Socket logic for real-time tracking
        if (user) {
            connectSocket(user._id);

            // Join the order room once we have an order loaded
            if (order?._id) {
                console.log(`📦 [Tracking] Joining order room: ${order._id}`);
                socket.emit('join_order', order._id);
            }

            socket.on('order_status_update', (data) => {
                console.log('🔄 Live status update received:', data);
                if (order && (data.orderId === order._id || data.orderId === order.orderId)) {
                    setOrder(prev => ({ ...prev, orderStatus: data.status }));
                }
            });

            socket.on('rider_location_updated', (data) => {
                console.log('📍 Live rider moving:', data);
                if (order && data.orderId === order._id) {
                    setOrder(prev => ({
                        ...prev,
                        rider: {
                            ...prev.rider,
                            currentLocation: {
                                latitude: data.location.lat,
                                longitude: data.location.lng
                            }
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

    const handleExplicitTrack = async (id) => {
        setSearching(true);
        setError('');
        try {
            const response = await API.get(`/orders/${id}`);
            setOrder(response.data.data);
        } catch (error) {
            setError('Order information is loading or not available.');
            setOrder(null);
        } finally {
            setSearching(false);
        }
    };

    const handleTrack = async () => {
        const query = orderIdSearch.trim().toUpperCase();
        if (!query) return;

        // Check if user is trying to track a coupon code
        if (COUPON_CODES.includes(query)) {
            setError(`'${query}' is a Coupon Code, not an Order ID. Please use your Order ID from the 'My Orders' section.`);
            setOrder(null);
            return;
        }

        setSearching(true);
        setError('');
        try {
            const response = await API.get(`/orders/${query}`);
            setOrder(response.data.data);
        } catch (error) {
            console.error('Tracking error:', error);
            setError(error.response?.data?.message || 'Order not found or access denied');
            setOrder(null);
        } finally {
            setSearching(false);
        }
    };

    const currentStatus = order ? STATUS_MAPPING[order.orderStatus] : 0;

    return (
        <div className="bg-[#F8F9FB] min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 py-16 px-6 text-center">
                <span className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
                    <Truck size={14} /> Live Tracking
                </span>
                <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-4">
                    Track Your Order 📦
                </h1>
                <p className="text-slate-400 text-lg font-medium max-w-xl mx-auto">
                    Enter your order ID below to see real-time delivery status.
                </p>
            </div>

            <div className="max-w-2xl mx-auto px-6 py-12">
                {/* Search Box */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-8">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                        Order ID
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={orderIdSearch}
                            onChange={(e) => setOrderIdSearch(e.target.value)}
                            placeholder="Enter Order ID (e.g. FC12345 or MongoID)"
                            className="flex-1 border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all placeholder:text-slate-300 placeholder:font-medium"
                            onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
                        />
                        <button
                            onClick={handleTrack}
                            disabled={searching}
                            className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
                        >
                            {searching ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>Track <ChevronRight size={16} /></>
                            )}
                        </button>
                    </div>
                    {error && (
                        <p className="text-red-500 text-xs font-bold mt-3 flex items-center gap-2">
                            <AlertCircle size={14} /> {error}
                        </p>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Don't know your Order ID?</p>
                        <Link to="/orders" className="text-[10px] text-orange-600 font-black uppercase tracking-widest hover:underline">Check My Orders →</Link>
                    </div>
                </div>

                {/* Tracking Result */}
                {order && (
                    <div className="space-y-6 animate-fade-up">
                        {/* Success / Delivery Message */}
                        {currentStatus === 4 && (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] p-10 text-white text-center shadow-xl shadow-emerald-100 animate-fade-up">
                                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl">
                                        😋
                                    </div>
                                    <h2 className="text-4xl font-black mb-2 tracking-tight">Enjoy Your Feast!</h2>
                                    <p className="text-emerald-50 font-medium text-lg">Your order was delivered successfully in record time.</p>
                                </div>

                                {/* Delivery Summary - Restaurant & Rider Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-up animate-delay-200">
                                    {/* Restaurant Profile */}
                                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:scale-[1.02]">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                            Local Treasure
                                        </p>
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 bg-orange-50 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center text-3xl">
                                                {order.restaurant?.image ? (
                                                    <img src={order.restaurant.image} alt="" className="w-full h-full object-cover" />
                                                ) : '🍳'}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-lg">{order.restaurant?.name || 'Restaurant'}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="text-orange-600 font-black text-xs">Top Rated</span>
                                                    <span className="text-slate-300">|</span>
                                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-tight">Hygienic</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rider Profile */}
                                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:scale-[1.02]">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                            <Truck size={14} /> Delivery Hero
                                        </p>
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 bg-blue-50 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center text-3xl">
                                                {order.rider?.profilePhoto ? (
                                                    <img src={order.rider.profilePhoto} alt="" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                                                ) : '🚴'}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-lg">{order.rider?.name || 'Partner'}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="text-blue-600 font-black text-xs">Platinum Level</span>
                                                    <span className="text-slate-300">|</span>
                                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-tight">Verified</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                                            <CheckCircle size={24} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 leading-tight">Rate your experience</p>
                                            <p className="text-slate-400 text-xs font-medium">Earn 50 loyalty points per review</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 text-2xl cursor-pointer hover:scale-105 transition-transform">
                                        {['⭐', '⭐', '⭐', '⭐', '⭐'].map((s, i) => <span key={i} className="hover:animate-bounce">{s}</span>)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Live Map (Only show when rider is on the way AND has location) */}
                        {currentStatus === 3 && order.rider?.currentLocation?.latitude && order.restaurant?.location?.coordinates && (
                            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 relative h-64 md:h-80 w-full z-0">
                                <MapContainer
                                    center={[order.rider.currentLocation.latitude, order.rider.currentLocation.longitude]}
                                    zoom={14}
                                    className="h-full w-full z-0"
                                    zoomControl={false}
                                >
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                    />
                                    {/* Rider Marker */}
                                    <Marker
                                        position={[order.rider.currentLocation.latitude, order.rider.currentLocation.longitude]}
                                        icon={riderIcon}
                                    >
                                        <Popup>Your Rider: {order.rider?.name}</Popup>
                                    </Marker>

                                    {/* Restaurant Marker */}
                                    {order.restaurant.location.coordinates[1] && order.restaurant.location.coordinates[0] && (
                                        <>
                                            <Marker
                                                position={[order.restaurant.location.coordinates[1], order.restaurant.location.coordinates[0]]}
                                                icon={restIcon}
                                            >
                                                <Popup>{order.restaurant.name}</Popup>
                                            </Marker>

                                            <Polyline
                                                positions={[
                                                    [order.restaurant.location.coordinates[1], order.restaurant.location.coordinates[0]],
                                                    [order.rider.currentLocation.latitude, order.rider.currentLocation.longitude]
                                                ]}
                                                color="#f97316"
                                                weight={4}
                                                dashArray="10, 10"
                                            />
                                        </>
                                    )}
                                </MapContainer>

                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase shadow-lg z-[1000] border border-slate-100 flex items-center gap-2 text-slate-700">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Live GPS
                                </div>
                            </div>
                        )}

                        {/* Order Info */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Order</p>
                                    <p className="text-2xl font-black text-slate-900">{order.orderId || order._id.slice(-8)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Total</p>
                                    <p className="text-2xl font-black text-orange-500">₹{order.total}</p>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-5">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">From</p>
                                <p className="font-black text-slate-900">{order.restaurant?.name || 'Restaurant'}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {order.items.map((item, i) => (
                                        <span key={i} className="text-xs bg-orange-50 text-orange-600 font-bold px-3 py-1 rounded-full">
                                            {item.name} x{item.quantity}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Progress Steps */}
                        {currentStatus !== -1 ? (
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-black text-slate-900 text-lg">Journey Tracker</h3>
                                    {currentStatus === 4 && <span className="text-emerald-500 font-black text-[10px] uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1.5"><CheckCircle size={12} /> Journey Completed</span>}
                                </div>
                                <div className="relative">
                                    {/* Progress line */}
                                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100" />
                                    <div
                                        className="absolute left-6 top-0 w-0.5 bg-orange-500 transition-all duration-1000"
                                        style={{ height: `${(Math.max(0, currentStatus) / (STEPS.length - 1)) * 100}%` }}
                                    />

                                    <div className="space-y-8">
                                        {STEPS.map((step, i) => {
                                            const Icon = step.icon;
                                            const done = i <= currentStatus;
                                            const active = i === currentStatus;
                                            const isDelivered = i === 4;
                                            return (
                                                <div key={step.label} className="flex items-start gap-6 relative">
                                                    <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${done
                                                        ? isDelivered
                                                            ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-100'
                                                            : 'bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-200'
                                                        : 'bg-slate-100'
                                                        }`}>
                                                        <Icon size={20} className={done ? 'text-white' : 'text-slate-400'} />
                                                        {active && currentStatus < 4 && (
                                                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-ping" />
                                                        )}
                                                    </div>
                                                    <div className="pt-2">
                                                        <p className={`font-black ${done ? 'text-slate-900' : 'text-slate-400'} ${active && isDelivered ? 'text-emerald-600' : ''}`}>
                                                            {step.label}
                                                            {active && currentStatus < 4 && <span className="ml-2 text-xs text-orange-500 font-black uppercase tracking-widest">● Now</span>}
                                                            {active && isDelivered && <span className="ml-2 text-xs text-emerald-500 font-black uppercase tracking-widest">● Completed</span>}
                                                        </p>
                                                        <p className="text-slate-400 text-sm font-medium">{step.desc}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-rose-50 rounded-3xl p-8 border border-rose-100 text-center">
                                <AlertCircle className="mx-auto text-rose-500 mb-4" size={40} />
                                <p className="font-black text-rose-600 text-xl">Order Cancelled</p>
                                <p className="text-rose-400 font-medium">This order was cancelled and will not be delivered.</p>
                            </div>
                        )}

                        {/* Rider Info - show once rider is assigned and until delivered */}
                        {order.rider && currentStatus >= 1 && currentStatus < 4 && (
                            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Your Rider</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl overflow-hidden shadow-lg flex items-center justify-center font-black text-xl">
                                            {order.rider?.profilePhoto ? (
                                                <img src={order.rider.profilePhoto} alt="" className="w-full h-full object-cover" />
                                            ) : '🚴'}
                                        </div>
                                        <div>
                                            <p className="font-black text-lg">{order.rider.name || order.rider.firstName || 'Rider'}</p>
                                            <p className="text-slate-400 font-medium text-sm flex items-center gap-1">
                                                <Clock size={12} /> {currentStatus < 4 ? 'Assigning route...' : 'On the way to you'}
                                            </p>
                                        </div>
                                    </div>
                                    {order.rider.phone && (
                                        <a
                                            href={`tel:${order.rider.phone}`}
                                            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors"
                                        >
                                            <Phone size={14} /> Call
                                        </a>
                                    )}
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Delivering to</p>
                                    <p className="font-bold text-white flex items-start gap-2">
                                        <MapPin size={16} className="text-orange-400 shrink-0 mt-0.5" />
                                        {order.deliveryAddress?.street ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}` : 'Your Address'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
