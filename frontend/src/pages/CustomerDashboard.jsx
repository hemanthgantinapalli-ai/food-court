import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    User, Package, Heart, CreditCard, HelpCircle,
    MapPin, Phone, Mail, LogOut, ChevronRight,
    Clock, ShieldCheck, Wallet, ArrowRight,
    TrendingUp, Star, Search, MessageSquare,
    Gift, Bell, ExternalLink
} from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import { useOrderStore } from '../store/orderStore';
import API from '../api/axios';
import Loader from '../components/Loader';

const TABS = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'help', label: 'Help Desk', icon: HelpCircle },
];

export default function CustomerDashboard() {
    const { user, logout, updateProfile, getProfile } = useAuthStore();
    // The useOrderStore's orders and fetchOrders are not used directly anymore for display,
    // as orders are now fetched and managed by local state for this component.
    // However, the store might still be used elsewhere or for other purposes.
    const { fetchOrders: fetchOrdersFromStore } = useOrderStore(); // Renamed to avoid conflict

    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

    const [loading, setLoading] = useState(true);
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [infoForm, setInfoForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
    const [orders, setOrders] = useState([]);
    const [favorites, setFavorites] = useState([]);

    // Support state
    const [supportTickets, setSupportTickets] = useState([]);
    const [showSupportForm, setShowSupportForm] = useState(false);
    const [supportForm, setSupportForm] = useState({ subject: '', message: '', orderId: '', priority: 'medium' });
    const [submittingSupport, setSubmittingSupport] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const init = async () => {
            // Only show full-screen loader if we don't have basic user data or orders yet
            const shouldShowLoader = !user || orders.length === 0;
            if (shouldShowLoader) setLoading(true);

            try {
                // Fetch basic data needed for overview
                await Promise.all([
                    fetchData(),
                    fetchSupportTickets()
                ]);
            } catch (err) {
                console.error("Dashboard init error:", err);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [user?.id, user?._id]);

    useEffect(() => {
        // Update infoForm when user object changes
        if (user) {
            setInfoForm({ name: user.name || '', phone: user.phone || '' });
        }
    }, [user]);

    useEffect(() => {
        // Update activeTab based on search params
        setActiveTab(searchParams.get('tab') || 'overview');
    }, [searchParams]);

    const fetchData = async () => {
        try {
            // Fetch orders history and use current user data from store
            const ordersRes = await API.get('/orders/history');
            setOrders(ordersRes.data?.data || []);
            setFavorites(user?.favorites || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    // Derived stats for efficiency
    const stats = React.useMemo(() => {
        const totalSpent = orders.reduce((sum, o) => sum + (o.orderStatus === 'delivered' ? o.total : 0), 0);
        const activeOrders = orders.filter(o => ['placed', 'confirmed', 'preparing', 'ready', 'on_the_way'].includes(o.orderStatus));
        const latestActiveOrder = activeOrders.length > 0 ? activeOrders[0] : null;
        return { totalSpent, activeOrders: activeOrders.length, latestActiveOrder };
    }, [orders]);

    const fetchSupportTickets = async () => {
        try {
            const res = await API.get('/support/my-requests');
            setSupportTickets(res.data.data);
        } catch (error) {
            console.error('Error fetching support tickets:', error);
        }
    };

    const handleSupportSubmit = async (e) => {
        e.preventDefault();
        setSubmittingSupport(true);
        try {
            await API.post('/support/create', supportForm);
            setSupportForm({ subject: '', message: '', orderId: '', priority: 'medium' });
            setShowSupportForm(false);
            fetchSupportTickets();
            alert('Support request submitted successfully!');
        } catch (error) {
            console.error('Failed to submit support request:', error);
            alert('Failed to submit support request');
        } finally {
            setSubmittingSupport(false);
        }
    };

    const handleUpdateTab = (tabId) => {
        setSearchParams({ tab: tabId });
    };

    const handleSaveInfo = async () => {
        try {
            await updateProfile(infoForm);
            setIsEditingInfo(false);
        } catch (error) {
            console.error('Update failed:', error);
        }
    };

    const displayName = user?.name?.split(' ')?.[0] || 'User';
    const initial = user?.name?.[0] || 'U';

    if (loading) return <Loader />;

    return (
        <div className="min-h-screen bg-[#F8F9FB] pt-24 pb-20">
            <div className="max-w-7xl mx-auto px-6">

                {/* Header Hero Section */}
                <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-10 md:p-14 border border-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-10 mb-10 overflow-hidden relative">
                    {/* Decorative Elements */}
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-orange-100 rounded-full blur-[100px] opacity-40" />
                    <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-red-100 rounded-full blur-[100px] opacity-40" />

                    <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                        <div className="relative group">
                            <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-red-600 rounded-[2.5rem] flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-orange-200 transition-transform group-hover:scale-105 duration-500">
                                {initial}
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 border-4 border-white rounded-2xl flex items-center justify-center shadow-lg">
                                <ShieldCheck size={18} className="text-white" />
                            </div>
                        </div>

                        <div className="text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                                    Welcome, <span className="text-orange-600">{displayName}</span>
                                </h1>
                                <span className="bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-orange-200">
                                    Gold Member
                                </span>
                            </div>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] flex items-center justify-center md:justify-start gap-2">
                                <Star size={10} className="text-orange-400 fill-orange-400" /> Member since Feb 2026
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 relative z-10">
                        <button
                            onClick={logout}
                            className="flex items-center gap-3 px-8 py-4 bg-white border-2 border-slate-50 rounded-2xl text-rose-500 font-black text-xs uppercase tracking-widest hover:border-rose-100 hover:bg-rose-50 transition-all shadow-md active:scale-95 group"
                        >
                            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" /> Sign Out
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-10">

                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-3">
                        <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-4 border border-white shadow-sm lg:sticky lg:top-24">
                            <nav className="space-y-2">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleUpdateTab(tab.id)}
                                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab.id
                                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 translate-x-1'
                                            : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                                            }`}
                                    >
                                        <tab.icon size={20} className={activeTab === tab.id ? 'text-orange-500' : ''} />
                                        {tab.label}
                                        {activeTab === tab.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />}
                                    </button>
                                ))}
                            </nav>

                            <div className="mt-8 pt-8 border-t border-slate-100 px-4 pb-4">
                                <div className="bg-gradient-to-br from-indigo-500 to-purple-700 rounded-3xl p-6 text-white relative overflow-hidden group cursor-pointer shadow-lg">
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Refer & Earn</p>
                                        <h4 className="font-black text-lg leading-tight mb-4">Get ₹200 for every friend!</h4>
                                        <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                                            Invite <ArrowRight size={12} />
                                        </button>
                                    </div>
                                    <Gift size={80} className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-9 min-h-[600px]">

                        {/* ─── OVERVIEW TAB ─── */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Stats Cards */}
                                    <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-10">
                                                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                                                    <Wallet size={28} className="text-white" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">Primary Wallet</span>
                                            </div>
                                            <p className="text-white/60 font-black text-xs uppercase tracking-widest mb-1">Total Balance</p>
                                            <h2 className="text-6xl font-black tracking-tight mb-10 group-hover:text-orange-500 transition-colors">₹{user?.wallet?.balance || '0.00'}</h2>
                                            <div className="flex gap-4">
                                                <button className="grow bg-white text-slate-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95">Add Funds</button>
                                                <button className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"><ExternalLink size={20} /></button>
                                            </div>
                                        </div>
                                        <CreditCard size={200} className="absolute -bottom-10 -right-10 text-white/5 -rotate-12 group-hover:scale-110 transition-transform duration-1000" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm flex items-center justify-between hover:shadow-xl hover:shadow-slate-100 transition-all group">
                                            <div>
                                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Active Now</p>
                                                <h3 className="text-4xl font-black text-slate-900">{stats.activeOrders}</h3>
                                            </div>
                                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <Clock size={28} />
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm flex items-center justify-between hover:shadow-xl hover:shadow-slate-100 transition-all group">
                                            <div>
                                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Total Spent</p>
                                                <h3 className="text-4xl font-black text-slate-900">₹{stats.totalSpent}</h3>
                                            </div>
                                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                <TrendingUp size={28} />
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm flex items-center justify-between hover:shadow-xl hover:shadow-slate-100 transition-all group">
                                            <div>
                                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Past Orders</p>
                                                <h3 className="text-4xl font-black text-slate-900">{orders.length}</h3>
                                            </div>
                                            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-[1.5rem] flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all">
                                                <Package size={28} />
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm flex items-center justify-between hover:shadow-xl hover:shadow-slate-100 transition-all group">
                                            <div>
                                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Saved Favorites</p>
                                                <h3 className="text-4xl font-black text-slate-900">{favorites.length}</h3>
                                            </div>
                                            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all">
                                                <Heart size={28} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Profile Details */}
                                <div className="bg-white rounded-[3rem] p-10 border border-white shadow-sm overflow-hidden relative">
                                    <div className="flex justify-between items-center mb-10">
                                        <h3 className="text-2xl font-black text-slate-900">Personal Information</h3>
                                        <button
                                            onClick={() => isEditingInfo ? handleSaveInfo() : setIsEditingInfo(true)}
                                            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${isEditingInfo ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-white border-slate-50 text-slate-400 hover:text-slate-900 hover:border-slate-200'
                                                }`}
                                        >
                                            {isEditingInfo ? 'Save Changes' : 'Edit Profile'}
                                        </button>
                                    </div>

                                    <div className="grid md:grid-cols-3 gap-10">
                                        <div className="group">
                                            <div className="flex items-center gap-4 text-slate-400 mb-4 font-black text-[10px] uppercase tracking-widest">
                                                <User size={14} className="text-orange-500" /> Full Name
                                            </div>
                                            {isEditingInfo ? (
                                                <input className="w-full bg-slate-50 border border-slate-100 py-3 px-4 rounded-xl font-bold" value={infoForm.name} onChange={e => setInfoForm({ ...infoForm, name: e.target.value })} />
                                            ) : (
                                                <p className="text-xl font-black text-slate-900">{user?.name}</p>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-4 text-slate-400 mb-4 font-black text-[10px] uppercase tracking-widest">
                                                <Mail size={14} className="text-orange-500" /> Email Address
                                            </div>
                                            <p className="text-xl font-black text-slate-900">{user?.email}</p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-4 text-slate-400 mb-4 font-black text-[10px] uppercase tracking-widest">
                                                <Phone size={14} className="text-orange-500" /> Mobile Number
                                            </div>
                                            {isEditingInfo ? (
                                                <input className="w-full bg-slate-50 border border-slate-100 py-3 px-4 rounded-xl font-bold" value={infoForm.phone} onChange={e => setInfoForm({ ...infoForm, phone: e.target.value })} />
                                            ) : (
                                                <p className="text-xl font-black text-slate-900">{user?.phone || 'Not provided'}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Live Order Tracking (Efficiency Add-on) */}
                                {stats.latestActiveOrder && (
                                    <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-[3rem] p-8 text-white shadow-xl shadow-orange-100 flex flex-col md:flex-row items-center justify-between gap-6 group">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                                                <Truck size={32} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Live Order Status</p>
                                                <h4 className="text-2xl font-black tracking-tight">{stats.latestActiveOrder.orderStatus.replace('_', ' ')}</h4>
                                                <p className="text-white/70 font-bold text-xs">Arriving from {stats.latestActiveOrder.restaurant?.name || 'Restaurant'}</p>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/track-order?orderId=${stats.latestActiveOrder.orderId || stats.latestActiveOrder._id}`}
                                            className="bg-white text-orange-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                                        >
                                            Track Order Live
                                        </Link>
                                    </div>
                                )}

                                <div className="pt-4 flex justify-between items-end">
                                    <div>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Recent Activity</h3>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Your latest orders and updates</p>
                                    </div>
                                    <button onClick={() => handleUpdateTab('orders')} className="text-orange-600 font-black text-xs uppercase tracking-widest hover:underline">View All History →</button>
                                </div>

                                <div className="space-y-4">
                                    {orders.length === 0 ? (
                                        <div className="bg-white rounded-[2rem] p-10 text-center border border-white shadow-sm">
                                            <p className="text-slate-400 font-bold">No orders yet.</p>
                                        </div>
                                    ) : (
                                        orders.slice(0, 3).map(order => (
                                            <div key={order._id} className="bg-white rounded-[2rem] p-6 border border-white shadow-sm hover:shadow-xl transition-all group">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                                                            <Package size={20} className="text-slate-300" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-slate-900 text-sm">{order.restaurant?.name || 'Order'}</h4>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">₹{order.total} • {order.orderStatus}</p>
                                                        </div>
                                                    </div>
                                                    <Link to={`/order/${order._id}`} className="bg-slate-50 hover:bg-slate-900 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                                        Details
                                                    </Link>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ─── ORDERS TAB ─── */}
                        {activeTab === 'orders' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Recent <span className="text-orange-500">Orders</span></h3>
                                    <Link to="/orders" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-500 transition-all">View All History <ChevronRight size={14} /></Link>
                                </div>

                                {orders.length === 0 ? (
                                    <div className="bg-white rounded-[3rem] p-24 text-center border border-white shadow-sm">
                                        <Package size={64} className="mx-auto text-slate-100 mb-6" />
                                        <h4 className="text-2xl font-black text-slate-900 mb-2">No orders yet</h4>
                                        <p className="text-slate-400 font-bold mb-8">Start exploring amazing local restaurants.</p>
                                        <Link to="/" className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl">Browse Menu</Link>
                                    </div>
                                ) : (
                                    orders.slice(0, 5).map(order => (
                                        <div key={order._id} className="bg-white rounded-[2rem] p-8 border border-white shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all group relative overflow-hidden">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100 group-hover:border-orange-200 group-hover:bg-orange-50 transition-all">
                                                        <Clock size={32} className="text-slate-300 group-hover:text-orange-500 transition-all" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                            Order #{order.orderId?.slice(-8) || order._id.slice(-8)} • {new Date(order.createdAt).toLocaleDateString()}
                                                        </p>
                                                        <h3 className="text-xl font-black text-slate-900 mb-1">{order.restaurant?.name || 'Restaurant Order'}</h3>
                                                        <p className="text-slate-500 font-bold text-sm">₹{order.total} • {order.items?.length} Items</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 w-full md:w-auto">
                                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${order.orderStatus === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        order.orderStatus === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                            'bg-blue-50 text-blue-600 border-blue-100 animate-pulse'
                                                        }`}>
                                                        {order.orderStatus?.replace('_', ' ')}
                                                    </span>
                                                    <Link to={`/order/${order._id}`} className="grow md:grow-0 text-center bg-slate-100 hover:bg-slate-900 hover:text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                                        View Details
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ─── FAVORITES TAB ─── */}
                        {activeTab === 'favorites' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Your <span className="text-rose-500">Favorites</span></h3>

                                {favorites.length === 0 ? (
                                    <div className="bg-white rounded-[3rem] p-24 text-center border border-white shadow-sm">
                                        <Heart size={64} className="mx-auto text-slate-100 mb-6" />
                                        <h4 className="text-2xl font-black text-slate-900 mb-2">Nothing here yet</h4>
                                        <p className="text-slate-400 font-bold mb-8">Tap the heart on any restaurant to save it here.</p>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 gap-8">
                                        {favorites.map(rest => (
                                            <Link key={rest._id} to={`/restaurant/${rest._id}`} className="bg-white rounded-[2.5rem] p-6 border border-white shadow-sm hover:shadow-xl transition-all group">
                                                <div className="relative rounded-[1.8rem] overflow-hidden aspect-[4/3] mb-6">
                                                    <img src={rest.image || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                                    <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center"><Heart size={18} className="text-white fill-white" /></div>
                                                </div>
                                                <h4 className="text-xl font-black text-slate-900 text-center mb-1">{rest.name}</h4>
                                                <div className="flex items-center justify-center gap-3 text-slate-400 font-bold text-xs">
                                                    <span className="flex items-center gap-1 text-orange-500"><Star size={14} className="fill-orange-500" /> {rest.rating || '4.8'}</span>
                                                    <span>•</span>
                                                    <span>{rest.cuisines?.slice(0, 2).join(', ') || 'Global'}</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── PAYMENTS TAB ─── */}
                        {activeTab === 'payments' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Payment <span className="text-orange-500">Vault</span></h3>

                                <div className="bg-white rounded-[3rem] p-10 border border-white shadow-sm">
                                    <h4 className="font-black text-xl mb-8 flex items-center gap-4">
                                        <CreditCard className="text-orange-500" /> Saved Methods
                                    </h4>

                                    <div className="space-y-4">
                                        <div className="p-6 rounded-3xl border-2 border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center text-white border border-slate-600">
                                                    <CreditCard size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900">•••• •••• •••• 4242</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expires 12/28</p>
                                                </div>
                                            </div>
                                            <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-emerald-100">Primary</span>
                                        </div>

                                        <button className="w-full py-6 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:border-orange-500 hover:text-orange-500 transition-all">
                                            + Add New Card
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-[3rem] p-10 border border-white">
                                    <h4 className="font-black text-xl mb-8">Recent Transactions</h4>
                                    <div className="divide-y divide-slate-100">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="py-6 flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                        <Wallet size={16} className="text-orange-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Load Wallet</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">Feb {10 + i}, 2026</p>
                                                    </div>
                                                </div>
                                                <p className="font-black text-emerald-600">+₹500.00</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── HELP TAB ─── */}
                        {activeTab === 'help' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-[3rem] p-14 text-white shadow-2xl relative overflow-hidden">
                                    <div className="relative z-10 max-w-lg">
                                        <h3 className="text-4xl font-black tracking-tight mb-4">Customer <span className="text-orange-400">Support</span></h3>
                                        <p className="text-white/80 font-bold mb-10 leading-relaxed">Our support team is active 24/7 to ensure your food experience is seamless and delightful.</p>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => setShowSupportForm(!showSupportForm)}
                                                className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                                            >
                                                {showSupportForm ? 'View Tickets' : 'New Support Request'}
                                            </button>
                                        </div>
                                    </div>
                                    <MessageSquare size={260} className="absolute -bottom-20 -right-20 text-white/10 -rotate-12" />
                                </div>

                                {showSupportForm ? (
                                    <div className="bg-white rounded-[3rem] p-10 border border-white shadow-sm max-w-2xl mx-auto w-full">
                                        <h4 className="font-black text-2xl mb-8 flex items-center gap-4 text-slate-900">
                                            <HelpCircle className="text-indigo-500" /> New Ticket
                                        </h4>
                                        <form onSubmit={handleSupportSubmit} className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Subject</label>
                                                <input
                                                    required
                                                    className="w-full bg-slate-50 border border-slate-100 py-4 px-6 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                                                    placeholder="Brief description of the issue"
                                                    value={supportForm.subject}
                                                    onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Priority</label>
                                                    <select
                                                        className="w-full bg-slate-50 border border-slate-100 py-4 px-6 rounded-2xl font-bold outline-none"
                                                        value={supportForm.priority}
                                                        onChange={e => setSupportForm({ ...supportForm, priority: e.target.value })}
                                                    >
                                                        <option value="low">Low</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="high">High</option>
                                                        <option value="urgent">Urgent</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Related Order (Optional)</label>
                                                    <select
                                                        className="w-full bg-slate-50 border border-slate-100 py-4 px-6 rounded-2xl font-bold outline-none"
                                                        value={supportForm.orderId}
                                                        onChange={e => setSupportForm({ ...supportForm, orderId: e.target.value })}
                                                    >
                                                        <option value="">None</option>
                                                        {orders.slice(0, 10).map(o => (
                                                            <option key={o._id} value={o._id}>#{o.orderId?.slice(-6) || o._id.slice(-6)} - ₹{o.total}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Message</label>
                                                <textarea
                                                    required
                                                    rows={4}
                                                    className="w-full bg-slate-50 border border-slate-100 py-4 px-6 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                                                    placeholder="Describe your problem in detail..."
                                                    value={supportForm.message}
                                                    onChange={e => setSupportForm({ ...supportForm, message: e.target.value })}
                                                />
                                            </div>
                                            <button
                                                disabled={submittingSupport}
                                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-50"
                                            >
                                                {submittingSupport ? 'Submitting...' : 'Submit Request'}
                                            </button>
                                        </form>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <h4 className="font-black text-2xl text-slate-900 flex items-center gap-4">
                                            Your Support Tickets <span className="text-slate-300 text-sm">({supportTickets.length})</span>
                                        </h4>
                                        {supportTickets.length === 0 ? (
                                            <div className="bg-white rounded-[3rem] p-20 text-center border border-white shadow-sm text-slate-400 font-bold">
                                                No tickets found. If you face any issues, create a new request above.
                                            </div>
                                        ) : (
                                            <div className="grid gap-6">
                                                {supportTickets.map(ticket => (
                                                    <div key={ticket._id} className="bg-white rounded-[2rem] p-8 border border-white shadow-sm hover:shadow-xl transition-all">
                                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                                            <div className="flex items-center gap-6">
                                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black uppercase text-[10px] ${ticket.status === 'open' ? 'bg-amber-50 text-amber-600' :
                                                                    ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                                                                    }`}>
                                                                    {ticket.status}
                                                                </div>
                                                                <div>
                                                                    <h5 className="font-black text-lg text-slate-900">{ticket.subject}</h5>
                                                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                                                                        {new Date(ticket.createdAt).toLocaleDateString()} • Priority: <span className={
                                                                            ticket.priority === 'urgent' ? 'text-rose-500' :
                                                                                ticket.priority === 'high' ? 'text-orange-500' : 'text-indigo-400'
                                                                        }>{ticket.priority}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-left md:text-right max-w-md">
                                                                <p className="text-slate-500 text-sm font-medium italic">"{ticket.message}"</p>
                                                                {ticket.order && (
                                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2">Related Order: #{ticket.order.orderId || 'Order'}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div >
    );
}
