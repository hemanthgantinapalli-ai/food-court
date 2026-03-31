import React, { useState, useEffect } from 'react';
import { MapPin, Package, Truck, CheckCircle, Clock, Phone, ChevronRight, AlertCircle, Loader2, Navigation, TrendingUp, ShieldCheck, X } from 'lucide-react';
import API from '../api/axios';
import { useAuthStore } from '../context/authStore';
import { useSearchParams, Link } from 'react-router-dom';
import { socket, connectSocket } from '../api/socket.js';
import LeafletTrackingMap from '../components/LeafletTrackingMap.jsx';


// ── TrackOrderPage uses TrackingMap (Google Maps) for the live map section ──

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

// ─── Precision Tenali Coordinates (Reference Points) ────────────────────────
const LOCATIONS = {
    RESTAURANT: { latitude: 16.2367, longitude: 80.6475 }, // Tenali Police Statue (Core)
    CUSTOMER:   { latitude: 16.2340, longitude: 80.6480 }, // Nearby Residential
    RIDER:      { latitude: 16.2380, longitude: 80.6465 }  // Nearby Road
};
const TENALI_CENTER = LOCATIONS.RESTAURANT;

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
    const [liveRiderPos, setLiveRiderPos] = useState(null);
    const [eta, setEta] = useState(null);
    const [rating, setRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [platformSettings, setPlatformSettings] = useState({ liveTrackingToggle: true });

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3500);
    };

    const getRiderLocation = () => {
        if (liveRiderPos) return liveRiderPos;
        if (order?.riderLocation?.lat) {
            return { 
                latitude: order.riderLocation.lat, 
                longitude: order.riderLocation.lng,
                heading: order.riderLocation.bearing || 0,
                speed: order.riderLocation.speed || 0
            };
        }
        if (order?.riderProfile?.currentLocation?.latitude) {
            const loc = order.riderProfile.currentLocation;
            return {
                latitude: loc.latitude,
                longitude: loc.longitude,
                heading: loc.heading || 0,
                speed: loc.speed || 0
            };
        }
        if (order?.rider) {
            // High-quality fallback for assigned rider with no GPS yet (Morrispet)
            return { ...LOCATIONS.RIDER, heading: 0, speed: 0 };
        }

        const rest = order?.restaurant;
        const restLat = Number(rest?.location?.latitude || rest?.latitude);
        const restLng = Number(rest?.location?.longitude || rest?.longitude);
        if (restLat && restLng) return { latitude: restLat, longitude: restLng };
        
        // Final fallback: Restaurant position as requested
        return LOCATIONS.RESTAURANT;
    };

    const riderLoc = getRiderLocation();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await API.get('/admin/settings/public');
                if (res.data.success) {
                    setPlatformSettings(res.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch platform settings:', err);
            }
        };
        fetchSettings();
    }, []);

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
                }
            } catch (err) {
                console.error('Error fetching latest order:', err);
            } finally {
                setSearching(false);
            }
        };
        fetchLatestOrder();
    }, [user, searchParams]);

    // ── Forward Geocoding Fallback (Consuming Address String) ──
    useEffect(() => {
        if (!order || order.orderStatus === 'delivered') return;
        
        const geocodeMissingCoords = async () => {
            let updated = false;
            const newOrder = { ...order };

            // 1. Check Customer Address Coords
            if ((!order.deliveryAddress?.latitude || order.deliveryAddress?.latitude === 16.234) && order.deliveryAddress?.street) {
                try {
                    const query = `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, India`;
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                    const data = await res.json();
                    if (data && data[0]) {
                        newOrder.deliveryAddress = {
                            ...newOrder.deliveryAddress,
                            latitude: parseFloat(data[0].lat),
                            longitude: parseFloat(data[0].lon)
                        };
                        updated = true;
                    }
                } catch (e) { console.error("Customer geocoding failed", e); }
            }

            // 2. Check Restaurant Coords
            if ((!order.restaurant?.location?.latitude || order.restaurant?.location?.latitude === 16.2367) && order.restaurant?.name) {
                try {
                    const query = `${order.restaurant.name}, ${order.restaurant.location?.city || 'Tenali'}, India`;
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                    const data = await res.json();
                    if (data && data[0]) {
                        newOrder.restaurant = {
                            ...newOrder.restaurant,
                            location: {
                                ...newOrder.restaurant.location,
                                latitude: parseFloat(data[0].lat),
                                longitude: parseFloat(data[0].lon)
                            }
                        };
                        updated = true;
                    }
                } catch (e) { console.error("Restaurant geocoding failed", e); }
            }

            if (updated) setOrder(newOrder);
        };

        const timer = setTimeout(geocodeMissingCoords, 1000);
        return () => clearTimeout(timer);
    }, [order?.orderStatus, order?.deliveryAddress?.street, order?.restaurant?.name]);

    useEffect(() => {
        if (user && order?._id) {
            connectSocket(user._id);
            socket.emit('joinOrder', order._id);

            const handleStatusUpdate = (data) => {
                if (data.orderId === order._id || data.orderId === order.orderId) {
                    setOrder(prev => ({ ...prev, orderStatus: data.status }));
                }
            };

            const handleLocationUpdate = (data) => {
                // Room logic isolates to this order. Map lat/lng directly from coordinates payload
                if (data && data.lat && data.lng) {
                    setLiveRiderPos({ 
                        latitude: data.lat, 
                        longitude: data.lng,
                        heading: data.heading || 0,
                        speed: data.speed || 0
                    });
                }
            };

            socket.on('order_status_update', handleStatusUpdate);
            socket.on('locationUpdate', handleLocationUpdate);
            socket.on('rider_position_update', (data) => {
                if (data.riderId === order.rider?._id?.toString()) {
                    setLiveRiderPos({ 
                        latitude: data.location.lat, 
                        longitude: data.location.lng,
                        heading: data.heading,
                        speed: data.speed
                    });
                }
            });

            return () => {
                socket.off('order_status_update', handleStatusUpdate);
                socket.off('locationUpdate', handleLocationUpdate);
                socket.off('rider_position_update');
            };
        }
    }, [user, order?._id, order?.orderId]);

    // Calculate ETA
    useEffect(() => {
        if (riderLoc?.latitude && order?.deliveryAddress?.latitude) {
            const dist = haversineDistance(
                riderLoc.latitude, riderLoc.longitude,
                order.deliveryAddress.latitude, order.deliveryAddress.longitude
            );
            let minutes = Math.max(2, Math.round((dist / 25) * 60)); // 25km/h avg
            if (['confirmed', 'preparing', 'ready'].includes(order.orderStatus)) minutes += 8;
            setEta(minutes);
        }
    }, [riderLoc, order?.deliveryAddress, order?.orderStatus]);

    const handleExplicitTrack = async (id) => {
        setSearching(true);
        try {
            const response = await API.get(`/orders/${id}`);
            setOrder(response.data.data);
        } catch (error) {
            console.error("Tracking error", error);
        } finally {
            setSearching(false);
        }
    };

    const handleTrack = async () => {
        const query = orderIdSearch.trim().toUpperCase();
        if (!query) return;
        setSearching(true);
        try {
            const response = await API.get(`/orders/${query}`);
            setOrder(response.data.data);
        } catch (error) {
            setOrder(null);
        } finally {
            setSearching(false);
        }
    };

    const handleSubmitReview = async () => {
        setIsSubmittingReview(true);
        try {
            // Mock API call for review submission
            await new Promise(resolve => setTimeout(resolve, 800));
            showToast('Review submitted! Thank you.');
            setOrder(null);
            window.location.href = '/'; // Go home
        } catch (err) {
            console.error("Review failed", err);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    return (
        <div className="h-screen w-full bg-slate-50 flex flex-col font-sans overflow-hidden">
            {/* ── App-Style Header ── */}
            <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-100 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to="/orders" className="p-1 hover:bg-slate-50 rounded-full transition-colors">
                        <X className="text-slate-400" size={24} />
                    </Link>
                    <div>
                        <h1 className="text-xs font-black text-slate-900 leading-none tracking-tight flex items-center gap-2">
                            ORDER <span className="opacity-60">#{(order?.orderId || order?._id || '').toUpperCase()}</span>
                        </h1>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {order?.items?.length || 0} items, ₹{order?.total || 0}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button className="text-orange-600 font-black text-[10px] uppercase tracking-widest py-1 px-3">HELP</button>
                    <button className="text-slate-300"><ChevronRight size={18} className="rotate-90" /></button>
                </div>
            </div>

            {/* ── Full Screen Map Container ── */}
            <div className="flex-1 relative">
                {!order ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-40 px-10 text-center">
                        <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center mb-6">
                            <Package className="text-orange-500 animate-pulse" size={32} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight italic">Locating your meal...</h2>
                        <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-black text-center focus:ring-4 focus:ring-orange-500/10 outline-none transition-all uppercase"
                            placeholder="Enter Order ID"
                            value={orderIdSearch}
                            onChange={(e) => setOrderIdSearch(e.target.value)}
                        />
                        <button onClick={handleTrack} className="mt-4 bg-slate-950 text-white w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Track Activity</button>
                    </div>
                ) : (
                    <div className="absolute inset-0 z-0">
                        {platformSettings?.liveTrackingToggle !== false ? (
                            <LeafletTrackingMap order={order} />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10 p-10 text-center">
                                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-6 border border-white/10 shadow-2xl">
                                    <ShieldCheck className="text-orange-500" size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2 tracking-tighter uppercase italic">Privacy Shield Active</h3>
                                <p className="text-white/40 font-bold text-xs max-w-xs leading-relaxed uppercase tracking-widest">
                                    Real-time GPS telemetry is currently restricted by platform policy. 
                                    Please monitor the status timeline below for updates.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Zomato Style Bottom Sheet (Main HUD) ── */}
            {order && order.orderStatus !== 'delivered' && (
                <div className="bg-white rounded-t-[2.5rem] shadow-[0_-15px_60px_rgba(0,0,0,0.12)] border-t border-slate-50 px-6 py-8 z-50 animate-in slide-in-from-bottom duration-500 ease-out">
                    <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto mb-6" />
                    <div className="flex flex-col gap-6">
                        {/* Status Section */}
                        <div className="flex items-start justify-between">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 mt-1">
                                    <Package size={24} />
                                </div>
                                <div className="flex-1 pr-4">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                        {order.orderStatus === 'placed' && 'Finding a Rider'}
                                        {['confirmed', 'preparing'].includes(order.orderStatus) && 'Preparing Order'}
                                        {order.orderStatus === 'ready' && 'Chef marked Ready'}
                                        {order.orderStatus === 'assigned' && 'Rider Assigned'}
                                        {order.orderStatus === 'arrived_at_restaurant' && 'Rider at Restaurant'}
                                        {order.orderStatus === 'picked_up' && 'Order Picked Up'}
                                        {order.orderStatus === 'on_the_way' && 'Coming to you'}
                                        <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">NOW</span>
                                    </h3>
                                    <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed italic opacity-80">
                                        {order.rider ? `${order.rider.name} is ${order.orderStatus === 'picked_up' ? 'heading to kitchen' : 'delivering'}. Delicious food en route!` : 
                                         'Sit back! Our chef is carefully crafting your meal with fresh ingredients.'}
                                    </p>
                                </div>
                            </div>
                            {order.rider && (
                                <div className="relative shrink-0">
                                    <div className="w-16 h-16 rounded-full border-4 border-slate-50 overflow-hidden shadow-inner bg-slate-100 ring-4 ring-blue-50/50">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${order.rider._id}`} alt="Rider" className="w-full h-full object-cover"/>
                                    </div>
                                    <button onClick={() => alert(`Dialing ${order.rider.name}...`)} className="absolute -bottom-1 -right-1 w-9 h-9 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-orange-700 active:scale-95"><Phone size={16} /></button>
                                </div>
                            )}
                        </div>
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                            <p className="text-[10px] font-bold text-slate-700">Expecting a slight delay due to rain in Ramalingeswara Pet area.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MISSION ACCOMPLISHED / RATING SCREEN ── */}
            {order && order.orderStatus === 'delivered' && (
                <div className="absolute inset-0 z-[100] bg-slate-950/20 backdrop-blur-[2px] flex flex-col items-center justify-end md:justify-center px-4 pb-12 md:pb-0 animate-in fade-in duration-1000">
                    <div className="w-full max-w-md bg-white rounded-[3.5rem] p-10 shadow-[0_30px_100px_rgba(0,0,0,0.4)] border border-white/20 animate-in zoom-in-95 slide-in-from-bottom-32 duration-1000 ease-out relative">
                        {/* Decorative background glow */}
                        <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="flex justify-center -mt-24 mb-6 relative">
                            <div className="w-28 h-28 bg-emerald-500 text-white rounded-[3rem] flex items-center justify-center shadow-2xl shadow-emerald-500/50 rotate-6 hover:rotate-0 transition-all duration-500 border-[6px] border-white group">
                                <CheckCircle size={56} className="group-hover:scale-110 transition-transform" />
                            </div>
                        </div>
                        
                        <div className="text-center">
                            <h2 className="text-3xl font-black text-slate-900 mb-1 tracking-tighter">Mission Accomplished!</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mb-8">Order #{(order.orderId || order._id).slice(-8)} Delivered</p>
                            
                            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 mb-8">
                                <p className="font-black text-slate-800 text-sm mb-4 tracking-tight">How was your food experience?</p>
                                <div className="flex justify-center gap-3 text-3xl mb-4 transition-all">
                                    {[1,2,3,4,5].map((num) => (
                                        <button 
                                            key={num} 
                                            onClick={() => setRating(num)}
                                            className={`hover:scale-125 transition-transform drop-shadow-sm active:scale-95 ${rating >= num ? 'grayscale-0' : 'grayscale opacity-30 scale-90'}`}
                                        >
                                            ⭐
                                        </button>
                                    ))}
                                </div>
                                <textarea 
                                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs font-bold outline-none h-20 resize-none focus:border-emerald-500 transition-colors shadow-inner" 
                                    placeholder="Write a compliment for the chef or rider..."
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={handleSubmitReview}
                                    disabled={isSubmittingReview}
                                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2"
                                >
                                    {isSubmittingReview ? <Loader2 size={16} className="animate-spin" /> : 'SUBMIT REVIEW'}
                                </button>
                                <Link to="/" className="w-full bg-slate-950 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all shadow-md">Back to discovery</Link>
                                <button onClick={() => window.location.href = '/'} className="w-full text-slate-400 py-2 font-black uppercase text-[9px] tracking-widest hover:text-slate-900 transition-all">Order Something Else</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Toast Notification ── */}
            {toastMsg && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-top duration-500">
                    <div className="bg-slate-900 border border-white/10 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{toastMsg}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
