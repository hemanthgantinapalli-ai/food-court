import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
    User, Package, Heart, CreditCard, HelpCircle,
    MapPin, Phone, Mail, LogOut, ChevronRight,
    Clock, ShieldCheck, Wallet, ArrowRight,
    TrendingUp, Star, Search, MessageSquare,
    Gift, Bell, ExternalLink, Truck, ArrowUpRight,
    Plus, Minus, X, Bike, RotateCcw
} from 'lucide-react';
import { socket, connectSocket, disconnectSocket, joinRoleRoom } from '../api/socket.js';
import { useAuthStore } from '../context/authStore';
import { useOrderStore } from '../store/orderStore';
import { useCartStore } from '../store/cartStore';
import API from '../api/axios';
import Loader from '../components/Loader';
import { getAssetURL } from '../utils/imageHandler';

const TABS = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'help', label: 'Help Desk', icon: HelpCircle },
    { id: 'profile_link', label: 'Profile Settings', icon: User },
];

export default function CustomerDashboard() {
    const { user, logout, updateProfile, getProfile } = useAuthStore();
    // The useOrderStore's orders and fetchOrders are not used directly anymore for display,
    // as orders are now fetched and managed by local state for this component.
    // However, the store might still be used elsewhere or for other purposes.
    const { fetchOrders: fetchOrdersFromStore } = useOrderStore(); // Renamed to avoid conflict

    // cart helpers needed for quick reorder buttons
    const { items: cartItems, addToCart, removeFromCart, clearCart } = useCartStore();

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

    const [loading, setLoading] = useState(true);
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [infoForm, setInfoForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
    const [orders, setOrders] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [favoriteFoods, setFavoriteFoods] = useState([]);
    const [supportTickets, setSupportTickets] = useState([]);
    const [showSupportForm, setShowSupportForm] = useState(false);
    const [supportForm, setSupportForm] = useState({ subject: '', message: '', orderId: '', priority: 'medium' });
    const [submittingSupport, setSubmittingSupport] = useState(false);
    const [backendStats, setBackendStats] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [selectedOrderForReview, setSelectedOrderForReview] = useState(null);
    const [reviewForm, setReviewForm] = useState({ score: 5, review: '' });
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Rewards modal state
    const [showRewardsModal, setShowRewardsModal] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [isToppingUp, setIsToppingUp] = useState(false);
    const [toasts, setToasts] = useState([]);

    const addToast = (msg, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [{ id, msg, type }, ...prev].slice(0, 5));
        setTimeout(() => setToasts(prev => prev.filter(n => n.id !== id)), 4000);
    };

    useEffect(() => {
        if (user) {
            connectSocket(user._id);
            joinRoleRoom(`user_${user._id}`);

            const handleStatusUpdate = (data) => {
                fetchNotifications();
                fetchData();
            };

            const handleSupportUpdate = (data) => {
                fetchNotifications();
                fetchSupportTickets();
            };

            socket.on('order_status_update', handleStatusUpdate);
            socket.on('support_update', handleSupportUpdate);

            return () => {
                socket.off('order_status_update', handleStatusUpdate);
                socket.off('support_update', handleSupportUpdate);
            };
        }
    }, [user?._id]);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const init = async () => {
            const shouldShowLoader = !user || orders.length === 0;
            if (shouldShowLoader) setLoading(true);

            try {
                await Promise.all([
                    fetchData(),
                    fetchSupportTickets(),
                    fetchNotifications(),
                    fetchTransactions(),
                    getProfile()
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
        if (user) {
            setInfoForm({ name: user.name || '', phone: user.phone || '' });
        }
    }, [user]);

    useEffect(() => {
        setActiveTab(searchParams.get('tab') || 'overview');
    }, [searchParams]);

    useEffect(() => {
        if (user) {
            setFavorites(user.favorites || []);
            setFavoriteFoods(user.favoriteFoods || []);
        }
    }, [user?.favorites, user?.favoriteFoods]);

    async function fetchData() {
        try {
            const [ordersRes, statsRes] = await Promise.all([
                API.get('/orders/history'),
                API.get('/auth/stats')
            ]);
            setOrders(ordersRes.data?.data || []);
            setBackendStats(statsRes.data?.data || null);
            setFavorites(user?.favorites || []);
            setFavoriteFoods(user?.favoriteFoods || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    }

    async function fetchTransactions() {
        try {
            const res = await API.get('/wallet/transactions');
            setTransactions(res.data.data);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        }
    }

    async function handleTopUp(e) {
        e.preventDefault();
        if (!topUpAmount || isNaN(topUpAmount) || Number(topUpAmount) <= 0) return;
        setIsToppingUp(true);
        try {
            const res = await API.post('/wallet/topup', { amount: Number(topUpAmount) });
            if (res.data.success) {
                setTopUpAmount('');
                getProfile();
                fetchTransactions();
                addToast('✅ Wallet topped up successfully!', 'success');
            }
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to top up wallet', 'error');
        } finally {
            setIsToppingUp(false);
        }
    }

    // Derived stats for efficiency
    const stats = React.useMemo(() => {
        const totalSpent = orders.reduce((sum, o) => sum + (o.orderStatus === 'delivered' ? (Number(o.total) || 0) : 0), 0);
        const activeOrders = orders.filter(o => ['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'].includes(o.orderStatus));
        const latestActiveOrder = activeOrders.length > 0 ? activeOrders[0] : null;
        return { totalSpent, activeOrders: activeOrders.length, latestActiveOrder };
    }, [orders]);

    async function fetchSupportTickets() {
        try {
            const res = await API.get('/support/my-requests');
            setSupportTickets(res.data?.data || []);
        } catch (error) {
            console.error('Error fetching support tickets:', error);
        }
    }

    async function fetchNotifications() {
        try {
            const res = await API.get('/notifications');
            setNotifications(res.data?.data || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }

    const handleClearNotifications = async () => {
        try {
            await API.delete('/notifications/clear');
            setNotifications([]);
        } catch (error) {
            console.error('Failed to clear notifications:', error);
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
            addToast('✅ Support request submitted successfully!', 'success');
        } catch (error) {
            console.error('Failed to submit support request:', error);
            addToast(error.response?.data?.message || 'Failed to submit support request', 'error');
        } finally {
            setSubmittingSupport(false);
        }
    };

    const handleUpdateTab = (tabId) => {
        if (tabId === 'profile_link') {
            navigate('/profile');
            return;
        }
        setSearchParams({ tab: tabId });
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setIsSubmittingReview(true);
        try {
            await API.post(`/orders/${selectedOrderForReview._id}/rate`, {
                score: reviewForm.score,
                review: reviewForm.review
            });
            addToast('⭐ Thank you for your feedback!', 'success');
            setSelectedOrderForReview(null);
            setReviewForm({ score: 5, review: '' });
            fetchData();
        } catch (error) {
            console.error('Review failed:', error);
            addToast(error.response?.data?.message || 'Failed to submit review', 'error');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    // ── Order Again ──────────────────────────────────────────────
    const [reorderingId, setReorderingId] = useState(null);
    const handleOrderAgain = (order) => {
        if (!order.items?.length) {
            addToast('No items found in this order.', 'error');
            return;
        }
        setReorderingId(order._id);
        clearCart();
        const restaurantRef = order.restaurant?._id || order.restaurant;
        order.items.forEach(item => {
            const product = {
                _id: item.menuItem?._id || item.menuItem || item._id,
                name: item.name,
                price: item.price,
                image: item.menuItem?.image || item.image || '',
                restaurant: restaurantRef,
                quantity: 1,
            };
            addToCart(product);
        });
        addToast('🛒 Items added to your cart! Redirecting…', 'success');
        setTimeout(() => {
            setReorderingId(null);
            navigate('/checkout');
        }, 1200);
    };
    // ─────────────────────────────────────────────────────────────

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
            {/* Toast Notifications */}
            <div className="fixed top-6 right-6 z-[9999] space-y-2 max-w-xs w-full pointer-events-none">
                {toasts.map(n => (
                    <div key={n.id} className={`px-5 py-4 rounded-2xl shadow-2xl font-black text-sm text-white transition-all animate-in slide-in-from-right-4 duration-300 ${n.type === 'success' ? 'bg-emerald-600' :
                            n.type === 'error' ? 'bg-rose-600' : 'bg-slate-900'
                        }`}>
                        {n.msg}
                    </div>
                ))}
            </div>
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

                                <div className="mt-6 bg-gradient-to-br from-orange-400 to-red-600 rounded-3xl p-6 text-white relative overflow-hidden group cursor-pointer shadow-lg" onClick={() => navigate('/rider')}>
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                                            {user?.role === 'rider' ? 'Quick Access' : 'Join our fleet'}
                                        </p>
                                        <h4 className="font-black text-lg leading-tight mb-2">
                                            {user?.role === 'rider' ? 'Rider Dashboard' : 'Earn on your own schedule.'}
                                        </h4>
                                        <p className="text-[9px] text-white/80 font-medium mb-4 leading-relaxed">
                                            {user?.role === 'rider'
                                                ? 'Manage your deliveries, earnings and online status from your dedicated rider console.'
                                                : 'Become a FoodCourt rider, enjoy flexible hours, instant payouts, and great incentives. Setup your Rider account today!'}
                                        </p>
                                        <div className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 w-max">
                                            {user?.role === 'rider' ? 'Go to Dashboard' : 'Apply Now'} 🏍️
                                        </div>
                                    </div>
                                    <Bike size={80} className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-9 min-h-[600px]">

                        {/* ─── OVERVIEW TAB ─── */}
                        {activeTab === 'overview' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid lg:grid-cols-12 gap-10">
                                    {/* Visual Spending Chart / Wallet */}
                                    <div className="lg:col-span-8 space-y-10">
                                        <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden group">
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-14">
                                                    <div>
                                                        <h4 className="font-black text-xs uppercase tracking-[0.2em] text-orange-500 mb-2">Spending Trends</h4>
                                                        <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Monthly expenditure overview</p>
                                                    </div>
                                                    <div className="flex bg-white/5 p-1 rounded-xl">
                                                        {['Weekly', 'Monthly'].map(t => (
                                                            <button key={t} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${t === 'Monthly' ? 'bg-orange-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>{t}</button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="h-64 flex items-end gap-4 mb-10">
                                                    {[25, 45, 30, 65, 85, 40, 55, 75, 50, 95, 60, 40].map((h, i) => (
                                                        <div
                                                            key={i}
                                                            style={{ height: `${h}%` }}
                                                            className="flex-1 bg-gradient-to-t from-orange-400 to-orange-600 rounded-2xl opacity-60 hover:opacity-100 hover:scale-110 transition-all cursor-pointer relative group/bar"
                                                        >
                                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-3 py-1.5 rounded-xl text-[10px] font-black opacity-0 group-hover/bar:opacity-100 transition-opacity shadow-2xl whitespace-nowrap">
                                                                ₹{Math.floor(h * 15.5)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex justify-between items-center pt-8 border-t border-white/5">
                                                    <div className="flex items-center gap-10">
                                                        <div>
                                                            <p className="text-white/30 text-[9px] font-black uppercase mb-1">Average Order</p>
                                                            <p className="text-xl font-black">₹482.50</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-white/30 text-[9px] font-black uppercase mb-1">Savings this month</p>
                                                            <p className="text-emerald-400 font-black text-xl flex items-center gap-1">₹1,240 <ArrowUpRight size={18} /></p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-white/30 text-[9px] font-black uppercase mb-1">Wallet Balance</p>
                                                        <p className="text-3xl font-black text-orange-500">₹{user?.wallet?.balance || '0.00'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <TrendingUp size={280} className="absolute -bottom-20 -right-20 text-white/5 -rotate-12 group-hover:scale-110 transition-transform duration-1000" />
                                        </div>
                                    </div>

                                    {/* Rewards & Tier Card */}
                                    <div className="lg:col-span-4 space-y-10">
                                        <div className="bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-sm flex flex-col items-center text-center group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8">
                                                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                                                    <Gift size={24} />
                                                </div>
                                            </div>

                                            <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-50 rounded-[2.5rem] flex items-center justify-center text-orange-600 text-3xl font-black mb-8 shadow-inner group-hover:rotate-12 transition-transform">
                                                <Star className="fill-orange-500" />
                                            </div>

                                            <h4 className="text-3xl font-black text-slate-900 mb-2">Gold Tier</h4>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-8">Loyalty Member since 2026</p>

                                            <div className="w-full space-y-6">
                                                <div className="text-left">
                                                    <div className="flex justify-between items-end mb-3">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Level: Platinum</p>
                                                        <p className="text-[10px] font-black text-slate-900">1,240 / 2,000 XP</p>
                                                    </div>
                                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-orange-500 rounded-full transition-all duration-1000 group-hover:w-[62%]" style={{ width: '62%' }} />
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center p-6 bg-slate-50 rounded-[2rem]">
                                                    <p className="text-[10px] font-black uppercase text-slate-400">Available Points</p>
                                                    <p className="text-2xl font-black text-slate-900">4,850</p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setShowRewardsModal(true)}
                                                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-slate-200"
                                                >
                                                    Redeem Rewards
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-4 gap-8">
                                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-50 shadow-sm flex items-center justify-between hover:shadow-xl transition-all group">
                                        <div>
                                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Active Now</p>
                                            <h3 className="text-4xl font-black text-slate-900">{backendStats?.activeOrders ?? stats.activeOrders}</h3>
                                        </div>
                                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all"><Clock size={28} /></div>
                                    </div>
                                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-50 shadow-sm flex items-center justify-between hover:shadow-xl transition-all group">
                                        <div>
                                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Total Spent</p>
                                            <h3 className="text-4xl font-black text-slate-900">₹{backendStats?.totalSpent ?? stats.totalSpent}</h3>
                                        </div>
                                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all"><TrendingUp size={28} /></div>
                                    </div>
                                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-50 shadow-sm flex items-center justify-between hover:shadow-xl transition-all group">
                                        <div>
                                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Past Orders</p>
                                            <h3 className="text-4xl font-black text-slate-900">{backendStats?.totalOrders ?? orders.length}</h3>
                                        </div>
                                        <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-[1.5rem] flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all"><Package size={28} /></div>
                                    </div>
                                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-50 shadow-sm flex items-center justify-between hover:shadow-xl transition-all group">
                                        <div>
                                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1">Saved Items</p>
                                            <h3 className="text-4xl font-black text-slate-900">{backendStats?.favoritesCount ?? favorites.length}</h3>
                                        </div>
                                        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all"><Heart size={28} /></div>
                                    </div>
                                </div>

                                {/* Quick Reorder / Favorites */}
                                <div>
                                    <div className="flex justify-between items-end mb-8">
                                        <div>
                                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Quick Reorder</h3>
                                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Your most loved meals, one tap away</p>
                                        </div>
                                        <button onClick={() => handleUpdateTab('favorites')} className="text-orange-600 font-black text-xs uppercase tracking-widest hover:underline">Manage Favorites →</button>
                                    </div>

                                    <div className="grid md:grid-cols-3 gap-8">
                                        {favoriteFoods.length === 0 ? (
                                            <div className="md:col-span-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center">
                                                <Heart className="mx-auto text-slate-300 mb-4" size={40} />
                                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No favorites saved yet to show here</p>
                                            </div>
                                        ) : (
                                            favoriteFoods.slice(0, 3).map(food => {
                                                const cartItem = cartItems.find(i => i._id === food._id);
                                                const quantity = cartItem ? cartItem.quantity : 0;
                                                // determine restaurant reference (id or object)
                                                const restaurantRef = food.restaurant?._id || food.restaurant || food.restaurantId;

                                                return (
                                                    <div key={food._id} className="bg-white rounded-[3rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col items-center text-center">
                                                        <div className="w-full aspect-square rounded-[2rem] overflow-hidden mb-6">
                                                            <img src={getAssetURL(food.image) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="" />
                                                        </div>
                                                        <h4 className="font-black text-slate-900 mb-1">{food.name}</h4>
                                                        <p className="text-orange-600 font-black text-xl mb-6">₹{food.price}</p>

                                                        {/* add-to-cart button or quantity selector */}
                                                        {quantity === 0 ? (
                                                            <button
                                                                onClick={() => addToCart({ ...food, restaurant: restaurantRef })}
                                                                className="w-full bg-slate-50 text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all"
                                                            >
                                                                Add to Bag
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center gap-4 bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-lg">
                                                                <button
                                                                    onClick={() => removeFromCart(food._id)}
                                                                    className="hover:text-orange-400 transition-colors"
                                                                >
                                                                    <Minus size={16} strokeWidth={3} />
                                                                </button>
                                                                <span className="font-black text-base w-5 text-center">{quantity}</span>
                                                                <button
                                                                    onClick={() => addToCart({ ...food, restaurant: restaurantRef })}
                                                                    className="hover:text-orange-400 transition-colors"
                                                                >
                                                                    <Plus size={16} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Active Order Tracker */}
                                {stats.latestActiveOrder && (
                                    <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                                            <div className="flex items-center gap-8">
                                                <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center animate-bounce shadow-xl">
                                                    <Truck size={40} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Real-time Order Status</p>
                                                    <h4 className="text-3xl font-black tracking-tight">{stats.latestActiveOrder.orderStatus.replace('_', ' ')}</h4>
                                                    <p className="text-white/80 font-bold mt-1 text-sm flex items-center gap-2">
                                                        <MapPin size={16} className="text-orange-400" /> Arriving from {stats.latestActiveOrder.restaurant?.name || 'Restaurant'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Link
                                                to={`/track-order?orderId=${stats.latestActiveOrder.orderId || stats.latestActiveOrder._id}`}
                                                className="w-full md:w-auto bg-white text-indigo-600 px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-2xl"
                                            >
                                                Live Track
                                            </Link>
                                        </div>
                                        <MessageSquare size={300} className="absolute -bottom-20 -right-20 text-white/5 -rotate-12 group-hover:scale-110 transition-transform duration-1000" />
                                    </div>
                                )}
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
                                                        <p className="text-slate-500 font-bold text-sm">₹{Number(order.total).toFixed(2)} • {order.items?.length} Items</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 w-full md:w-auto">
                                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${order.orderStatus === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        order.orderStatus === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                            order.orderStatus === 'picked_up' ? 'bg-sky-50 text-sky-600 border-sky-100 animate-pulse' :
                                                                order.orderStatus === 'on_the_way' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 animate-pulse' :
                                                                    'bg-orange-50 text-orange-600 border-orange-100 animate-pulse'
                                                        }`}>
                                                        {order.orderStatus?.replace('_', ' ')}
                                                    </span>
                                                    {order.rating?.score && (
                                                        <div className="flex gap-0.5 ml-2">
                                                            {[1, 2, 3, 4, 5].map(s => (
                                                                <Star key={s} size={10} className={s <= order.rating.score ? 'text-orange-500 fill-orange-500' : 'text-slate-200'} />
                                                            ))}
                                                        </div>
                                                    )}
                                                    <Link to={`/order/${order._id}`} className="grow md:grow-0 text-center bg-slate-100 hover:bg-slate-900 hover:text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                                        View Details
                                                    </Link>
                                                    {order.orderStatus === 'delivered' && !order.rating?.score && (
                                                        <button
                                                            onClick={() => setSelectedOrderForReview(order)}
                                                            className="bg-orange-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-100"
                                                        >
                                                            Rate Order
                                                        </button>
                                                    )}
                                                    {['delivered', 'cancelled'].includes(order.orderStatus) && (
                                                        <button
                                                            onClick={() => handleOrderAgain(order)}
                                                            disabled={reorderingId === order._id}
                                                            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg disabled:opacity-60"
                                                        >
                                                            <RotateCcw size={13} className={reorderingId === order._id ? 'animate-spin' : ''} />
                                                            {reorderingId === order._id ? 'Adding…' : 'Order Again'}
                                                        </button>
                                                    )}
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

                                {favorites.length === 0 && favoriteFoods.length === 0 ? (
                                    <div className="bg-white rounded-[3rem] p-24 text-center border border-white shadow-sm">
                                        <Heart size={64} className="mx-auto text-slate-100 mb-6" />
                                        <h4 className="text-2xl font-black text-slate-900 mb-2">Nothing here yet</h4>
                                        <p className="text-slate-400 font-bold mb-8">Tap the heart on any restaurant or food to save it here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-10">
                                        {/* Restaurants Section */}
                                        {favorites.length > 0 && (
                                            <div>
                                                <h4 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-6 px-2">Favorite Restaurants</h4>
                                                <div className="grid md:grid-cols-2 gap-8">
                                                    {favorites.map(rest => (
                                                        <Link key={rest._id} to={`/restaurant/${rest._id}`} className="bg-white rounded-[2.5rem] p-6 border border-white shadow-sm hover:shadow-xl transition-all group">
                                                            <div className="relative rounded-[1.8rem] overflow-hidden aspect-[4/3] mb-6">
                                                                <img src={getAssetURL(rest.image) || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
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
                                            </div>
                                        )}

                                        {/* Foods Section */}
                                        {favoriteFoods.length > 0 && (
                                            <div>
                                                <h4 className="font-bold text-xs uppercase tracking-widest mb-6 px-2 text-rose-500">Loved Foods</h4>
                                                <div className="grid md:grid-cols-2 gap-8">
                                                    {favoriteFoods.map(food => (
                                                        <div key={food._id} className="bg-white rounded-[2rem] p-5 border border-white shadow-sm hover:shadow-xl transition-all flex items-center gap-5">
                                                            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-sm shrink-0">
                                                                <img src={getAssetURL(food.image) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'} className="w-full h-full object-cover" alt="" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="font-black text-slate-900 text-base">{food.name}</h4>
                                                                <p className="text-orange-600 font-black text-lg">₹{food.price}</p>
                                                                <button
                                                                    onClick={() => handleUpdateTab('overview')} // For demo, redirect back to overview or something
                                                                    className="text-rose-500 font-black text-[10px] uppercase tracking-widest mt-2 hover:underline"
                                                                >
                                                                    Go to Shop →
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
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

                                <div className="bg-white rounded-[3rem] p-10 border border-white shadow-sm">
                                    <h4 className="font-black text-xl mb-8 flex items-center gap-4">
                                        <Wallet className="text-orange-500" /> Wallet Balance
                                    </h4>
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-8 bg-slate-50 p-8 rounded-3xl">
                                        <div className="text-center sm:text-left">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Available Funds</p>
                                            <p className="text-5xl font-black text-slate-900 tracking-tight">₹{user?.wallet?.balance || 0}</p>
                                        </div>
                                        <form onSubmit={handleTopUp} className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                            <input
                                                type="number"
                                                placeholder="Enter amount"
                                                value={topUpAmount}
                                                onChange={(e) => setTopUpAmount(e.target.value)}
                                                className="px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-orange-500 transition-all font-bold w-full sm:w-40"
                                            />
                                            <button
                                                type="submit"
                                                disabled={isToppingUp}
                                                className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                            >
                                                {isToppingUp ? 'Processing...' : 'Top Up Wallet'}
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[3rem] p-10 border border-white shadow-sm">
                                    <h4 className="font-black text-xl mb-8">Recent Transactions</h4>
                                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-4">
                                        {transactions.length === 0 ? (
                                            <div className="py-10 text-center">
                                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No transactions yet</p>
                                            </div>
                                        ) : (
                                            transactions.map(txn => (
                                                <div key={txn._id} className="py-6 flex justify-between items-center group hover:bg-slate-50/50 transition-colors px-4 rounded-2xl">
                                                    <div className="flex items-center gap-6">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${txn.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                            {txn.type === 'credit' ? <Plus size={18} /> : <Minus size={18} />}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900">{txn.description}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(txn.createdAt).toLocaleDateString()} • {new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        </div>
                                                    </div>
                                                    <p className={`font-black text-lg ${txn.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {txn.type === 'credit' ? '+' : '-'}₹{txn.amount}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── NOTIFICATIONS TAB ─── */}
                        {activeTab === 'notifications' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="flex justify-between items-end mb-8">
                                    <div>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Recent <span className="text-orange-500">Notifications</span></h3>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Stay updated with your order progress</p>
                                    </div>
                                    <button onClick={handleClearNotifications} className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-rose-500 transition-colors">Clear All</button>
                                </div>

                                {notifications.length === 0 ? (
                                    <div className="bg-white rounded-[3rem] p-24 text-center border border-white shadow-sm">
                                        <Bell size={64} className="mx-auto text-slate-100 mb-6" />
                                        <h3 className="text-2xl font-black text-slate-900 mb-2">All caught up!</h3>
                                        <p className="text-slate-400 font-bold">New updates about your orders will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {notifications.map(notif => (
                                            <div key={notif.id} className={`p-6 rounded-[2rem] border transition-all flex items-start gap-6 ${notif.type === 'success' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100'}`}>
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {notif.type === 'success' ? <ShieldCheck size={24} /> : <Bell size={24} />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="font-black text-slate-900">{notif.title}</h4>
                                                        <span className="text-[10px] font-black text-slate-400">{new Date(notif.createdAt || notif.time).toLocaleTimeString()}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{notif.message}</p>
                                                    {notif.orderId && (
                                                        <Link to={`/order/${notif.orderId}`} className="inline-block mt-3 text-[10px] font-black uppercase tracking-widest text-orange-600 hover:underline">Track Order →</Link>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Order Review Modal */}
                        {/* Rewards modal */}
                        {showRewardsModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
                                <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-fade-up">
                                    <button
                                        onClick={() => setShowRewardsModal(false)}
                                        className="absolute top-4 right-4 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>

                                    <h3 className="text-2xl font-black text-slate-900 text-center mb-4">Rewards Coming Soon</h3>
                                    <p className="text-slate-500 text-sm text-center font-medium">
                                        Our rewards portal is under construction. Check back later to redeem your points!
                                    </p>
                                    <button
                                        onClick={() => setShowRewardsModal(false)}
                                        className="mt-6 w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-500 transition-colors shadow-xl"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedOrderForReview && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
                                <div className="bg-white rounded-[3rem] p-10 max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-300">
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Rate your Meal</h3>
                                        <button onClick={() => setSelectedOrderForReview(null)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-100 transition-all hover:rotate-90">✕</button>
                                    </div>

                                    <div className="flex flex-col items-center mb-10 text-center">
                                        <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mb-4">
                                            <Star size={36} className="fill-orange-500" />
                                        </div>
                                        <h4 className="text-xl font-black text-slate-900">{selectedOrderForReview.restaurant?.name || 'Order'}</h4>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Order #{(selectedOrderForReview.orderId || selectedOrderForReview._id).slice(-6)}</p>
                                    </div>

                                    <form onSubmit={handleReviewSubmit} className="space-y-8">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">How was the food & experience?</p>
                                            <div className="flex justify-center gap-4">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() => setReviewForm({ ...reviewForm, score: star })}
                                                        className={`w-14 h-14 rounded-2xl transition-all flex items-center justify-center shadow-lg ${reviewForm.score >= star ? 'bg-orange-500 text-white scale-110 shadow-orange-200' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
                                                    >
                                                        <Star size={24} className={reviewForm.score >= star ? 'fill-white' : ''} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Leave a Review (Optional)</label>
                                            <textarea
                                                className="w-full bg-slate-50 border border-slate-100 py-5 px-6 rounded-3xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all resize-none"
                                                rows={4}
                                                placeholder="What did you love? Let the restaurant know!"
                                                value={reviewForm.review}
                                                onChange={e => setReviewForm({ ...reviewForm, review: e.target.value })}
                                            />
                                        </div>

                                        <button
                                            disabled={isSubmittingReview}
                                            className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                                        >
                                            {isSubmittingReview ? 'Submitting...' : 'Submit Feedback'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
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
        </div>
    );
}
