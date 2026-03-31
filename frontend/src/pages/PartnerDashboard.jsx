import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, ShoppingCart, TrendingUp, UtensilsCrossed, ArrowUpRight, Bell, Plus, Trash2, Edit3, X, CheckCircle, Clock, Package, ArrowRight, Image as ImageIcon } from 'lucide-react';
import Loader from '../components/Loader';
import { useAuthStore } from '../context/authStore';
import API from '../api/axios';
import ImageUploadField from '../components/ImageUploadField';
import { socket, connectSocket } from '../api/socket';
import PartnerBI from '../components/PartnerBI';

const STATUS_COLORS = {
    placed: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-orange-100 text-orange-700',
    ready: 'bg-teal-100 text-teal-700',
    assigned: 'bg-purple-100 text-purple-700',
    arrived_at_restaurant: 'bg-cyan-100 text-cyan-700',
    picked_up: 'bg-sky-100 text-sky-700',
    on_the_way: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
};

export default function PartnerDashboard() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [ordersList, setOrdersList] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [persistentNotifications, setPersistentNotifications] = useState([]); // from DB
    const [toasts, setToasts] = useState([]); // transient
    const [supportRequests, setSupportRequests] = useState([]);
    const [supportForm, setSupportForm] = useState({ subject: '', message: '', priority: 'medium' });
    const [transactions, setTransactions] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [incomingOrderAlert, setIncomingOrderAlert] = useState(null);
    const [audioRef] = useState(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));


    const [formLoading, setFormLoading] = useState(false);
    const [showMenuForm, setShowMenuForm] = useState(false);
    const [editingMenuId, setEditingMenuId] = useState(null);
    const [menuForm, setMenuForm] = useState({ name: '', price: '', category: '', description: '', image: '', restaurant: '', isVeg: true, isAvailable: true });

    const [editingRestaurantId, setEditingRestaurantId] = useState(null);
    const [showRestaurantForm, setShowRestaurantForm] = useState(false);
    const [restaurantForm, setRestaurantForm] = useState({ name: '', description: '', image: '', city: 'Mumbai', address: '', cuisines: [], isOpen: true, openTime: '10:00', closeTime: '22:00', averagePrice: 500, fssaiLicense: '', gstin: '', panNumber: '' });

    const addToast = (msg, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [{ id, msg, type }, ...prev].slice(0, 10));
        setTimeout(() => setToasts(prev => prev.filter(n => n.id !== id)), 5000);
    };

    useEffect(() => {
        if (user?.role === 'restaurant') {
            fetchData();

            connectSocket(user._id);
            const handleNewOrder = (newOrder) => {
                setOrdersList((prev) => {
                    if (prev.some(o => o._id === newOrder._id)) return prev;
                    return [newOrder, ...prev];
                });
                addToast(`🔔 New Order Received! #${(newOrder.orderId || newOrder._id)?.slice(-8)}`, 'info');
                fetchNotifications();
                
                // Show the persistent alert popup and loop the alarm
                setIncomingOrderAlert(newOrder);
                audioRef.loop = true;
                audioRef.play().catch(e => console.log("Audio play blocked", e));
            };

            socket.on('new_restaurant_order', handleNewOrder);

            return () => {
                socket.off('new_restaurant_order', handleNewOrder);
            };
        }
    }, [user]);

    const fetchData = async () => {
        const isInitialLoad = !stats;
        if (isInitialLoad) setLoading(true);
        fetchNotifications();
        try {
            const [statsRes, ordersRes, menuRes, restRes, supportRes] = await Promise.all([
                API.get('/partner/stats'),
                API.get('/partner/orders'),
                API.get('/partner/menu'),
                API.get('/partner/my-restaurants'),
                API.get('/support/my-requests'),
            ]);
            setStats(statsRes.data.data);
            setOrdersList(ordersRes.data.data);
            setMenuItems(menuRes.data.data);
            setRestaurants(restRes.data.data);
            setSupportRequests(supportRes.data.data || []);
            fetchTransactions();

        } catch (error) {
            console.error('Error fetching partner data:', error);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await API.get('/notifications');
            setPersistentNotifications(res.data.data);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    const fetchTransactions = async () => {
        try {
            const res = await API.get('/wallet/transactions');
            setTransactions(res.data.data);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        }
    };

    const handleClearNotifications = async () => {
        try {
            await API.delete('/notifications/clear');
            setPersistentNotifications([]);
        } catch (err) {
            alert('Failed to clear notifications');
        }
    };

    const handleStatusUpdate = async (orderId, status) => {
        try {
            await API.put(`/orders/${orderId}/status`, { status });
            setOrdersList(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: status } : o));
            addToast(`✅ Order status updated to ${status}`, 'info');
            fetchNotifications();
            if (incomingOrderAlert?._id === orderId) dismissIncomingAlert();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update');
        }
    };

    const dismissIncomingAlert = () => {
       setIncomingOrderAlert(null);
       audioRef.pause();
       audioRef.currentTime = 0;
    };

    const handleMenuSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            if (editingMenuId) {
                const response = await API.put(`/menu/${editingMenuId}`, menuForm);
                setMenuItems(menuItems.map(i => i._id === editingMenuId ? response.data.data : i));
                addToast('🍲 Menu item updated');
            } else {
                const response = await API.post('/menu', {
                    ...menuForm,
                    restaurantId: menuForm.restaurant || restaurants[0]?._id
                });
                setMenuItems([response.data.data, ...menuItems]);
                addToast('🍲 Menu item added');
            }
            setShowMenuForm(false);
            setEditingMenuId(null);
            setMenuForm({ name: '', price: '', category: 'Mains', description: '', image: '', restaurant: restaurants[0]?._id || '', isVeg: true, isAvailable: true });
        } catch (error) {
            addToast(error.response?.data?.message || 'Failed to save item', 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteMenuItem = async (id) => {
        if (!window.confirm('🗑️ Delete this dish forever?')) return;
        try {
            await API.delete(`/menu/${id}`);
            setMenuItems(menuItems.filter(item => item._id !== id));
            addToast('🔥 Item deleted successfully', 'info');
        } catch (err) {
            console.error('Delete failed:', err);
            addToast('❌ Delete failed. Please try again.', 'error');
        }
    };

    const toggleMenuItemStatus = async (item) => {
        try {
            const response = await API.put(`/menu/${item._id}`, { isAvailable: !item.isAvailable });
            setMenuItems(menuItems.map(i => i._id === item._id ? { ...i, isAvailable: response.data.data.isAvailable } : i));
        } catch (error) {
            addToast('Failed to toggle availability', 'error');
        }
    };

    const handleRestaurantSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const payload = {
                ...restaurantForm,
                location: {
                    city: restaurantForm.city,
                    address: restaurantForm.address
                },
                openingHours: {
                    open: restaurantForm.openTime,
                    close: restaurantForm.closeTime
                }
            };
            if (editingRestaurantId) {
                await API.put(`/restaurants/${editingRestaurantId}`, payload);
                addToast('Restaurant profile updated');
            } else {
                await API.post('/restaurants', payload);
                addToast('New restaurant registered! Awaiting approval');
            }
            setShowRestaurantForm(false);
            setEditingRestaurantId(null);
            // Assuming fetchRestaurants is a function that re-fetches the list of restaurants
            // If not, you might want to update the 'restaurants' state directly here.
            // For now, I'll keep it as per the instruction.
            // If fetchRestaurants is not defined elsewhere, this will cause an error.
            // A common pattern would be to call fetchData() again or a specific fetchRestaurants()
            // that updates the 'restaurants' state.
            // For example: fetchData();
            // Or if you have a dedicated fetchRestaurants:
            // const fetchRestaurants = async () => {
            //     try {
            //         const res = await API.get('/partner/my-restaurants');
            //         setRestaurants(res.data.data);
            //     } catch (err) {
            //         console.error('Error fetching restaurants:', err);
            //     }
            // };
            // fetchRestaurants();
            fetchData(); // Re-fetch all data including restaurants
        } catch (error) {
            addToast(error.response?.data?.message || 'Failed to save restaurant', 'error');
        } finally {
            setFormLoading(false);
        }
    };

    if (!user || user.role !== 'restaurant') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
                <div className="text-center bg-white p-12 rounded-[2rem] shadow-sm border border-slate-100 max-w-sm w-full mx-4 font-sans">
                    <h1 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h1>
                    <p className="text-slate-500 font-medium">You do not have permission to view the Partner Dashboard.</p>
                    <Link to="/restaurant/login" className="mt-6 inline-block px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all">
                        Partner Sign In
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) return <Loader />;

    const activeOrders = ordersList.filter(o => !['delivered', 'cancelled'].includes(o.orderStatus));

    const statCards = [
        { label: 'Your Earnings (80%)', value: `₹${stats?.partnerEarnings?.toLocaleString() || 0}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', note: 'After 20% platform fee' },
        { label: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50', note: `${stats?.completedOrders || 0} completed` },
        { label: 'Live Orders', value: activeOrders.length, icon: Package, color: 'text-orange-600', bg: 'bg-orange-50', note: 'Needs your attention' },
        { label: 'Menu Items', value: stats?.totalMenuItems || 0, icon: UtensilsCrossed, color: 'text-purple-600', bg: 'bg-purple-50', note: 'Active dishes' },
    ];

    return (
        <div className="min-h-screen bg-[#F8F9FB] pt-24 pb-12">

            {/* Toast Notifications */}
            <div className="fixed top-6 right-6 z-50 space-y-2 max-w-xs w-full">
                {toasts.map(n => (
                    <div key={n.id} className="px-5 py-4 rounded-2xl shadow-2xl font-black text-sm text-white bg-emerald-600 transition-all">
                        {n.msg}
                    </div>
                ))}
            </div>

            {/* 🔥 Persistent New Order Alert Overlay */}
            {incomingOrderAlert && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border-4 border-orange-500 animate-in zoom-in-95 fade-in duration-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-orange-500 animate-pulse" />
                        <div className="text-center">
                            <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-bounce">
                                <Bell size={48} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">New Order!</h2>
                            <p className="text-slate-500 font-bold mb-1">
                                Order #{incomingOrderAlert.orderId?.slice(-8) || incomingOrderAlert._id.slice(-8)}
                            </p>
                            <p className="text-2xl font-black text-orange-600 mb-8">₹{incomingOrderAlert.total?.toFixed(0)}</p>
                            
                            <div className="space-y-3">
                                <button 
                                    onClick={() => handleStatusUpdate(incomingOrderAlert._id, 'confirmed')}
                                    className="w-full bg-emerald-500 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all"
                                >
                                    Accept Order
                                </button>
                                <button 
                                    onClick={dismissIncomingAlert}
                                    className="w-full bg-slate-100 text-slate-500 font-black text-sm uppercase tracking-widest py-4 rounded-2xl hover:bg-slate-200 active:scale-95 transition-all"
                                >
                                    Dismiss Alert
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="bg-white rounded-[2.5rem] p-8 md:p-12 mb-8 border border-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 bg-gradient-to-br from-white to-slate-50/50">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-slate-100 rounded-3xl overflow-hidden border-2 border-white shadow-xl flex items-center justify-center font-black text-2xl text-slate-800 group hover:scale-105 transition-all">
                            {restaurants[0]?.image ? <img src={restaurants[0].image} className="w-full h-full object-cover" /> : <Store size={36} className="text-slate-300" />}
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{restaurants[0]?.name || 'Partner Dashboard'}</h1>
                            <div className="flex items-center gap-3 mt-2">
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${restaurants[0]?.isOpen ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${restaurants[0]?.isOpen ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                                    <span className="font-black text-[9px] uppercase tracking-widest">{restaurants[0]?.isOpen ? 'Store Live' : 'Paused'}</span>
                                </div>
                                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em]">{restaurants[0]?.cuisines?.slice(0, 2).join(', ') || 'Multi-cuisine'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {activeOrders.length > 0 && (
                            <div className="relative flex items-center gap-3 bg-orange-600 text-white px-5 py-3 rounded-2xl shadow-lg shadow-orange-100">
                                <Bell className="animate-bounce" size={18} />
                                <span className="font-black text-xs uppercase tracking-widest">{activeOrders.length} New Task</span>
                            </div>
                        )}
                        <button
                            onClick={() => { logout(); window.location.href = '/restaurant/login'; }}
                            className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-rose-600 transition-all shadow-xl active:scale-95"
                            title="Sign Out"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {statCards.map((stat, i) => (
                        <div key={i} className="bg-white rounded-[2rem] p-8 border border-white shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2">{stat.label}</p>
                                    <p className="text-3xl font-black text-slate-900 tracking-tighter group-hover:text-emerald-600 transition-colors">{stat.value}</p>
                                    {stat.note && <p className="text-[10px] text-slate-400 font-bold mt-1">{stat.note}</p>}
                                </div>
                                <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                                    <stat.icon size={28} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Tabs */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex border-b border-slate-50 p-2 gap-2 bg-slate-50/50 overflow-x-auto">
                        {[
                            { id: 'overview', label: 'Overview' },
                            { id: 'insights', label: 'Insights 📈' },
                            { id: 'orders', label: `Live Orders${activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}` },
                            { id: 'menu', label: 'Menu Items' },
                            { id: 'restaurants', label: 'My Restaurants' },
                            { id: 'wallet', label: 'Wallet & Earnings' },
                            { id: 'notifications', label: `Notifications ${persistentNotifications.filter(n => !n.read).length > 0 ? `(${persistentNotifications.filter(n => !n.read).length})` : ''}` },
                            { id: 'help', label: 'Help Desk' },
                            { id: 'profile_link', label: 'Profile Settings' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    if (tab.id === 'profile_link') {
                                        navigate('/profile');
                                        return;
                                    }
                                    setActiveTab(tab.id);
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-white text-emerald-600 shadow-sm scale-105'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                            >
                                {(tab.id === 'orders' && activeOrders.length > 0) || (tab.id === 'notifications' && persistentNotifications.filter(n => !n.read).length > 0) ? (
                                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                ) : null}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-8 md:p-12">

                        {/* ─── WALLET TAB ─── */}
                        {activeTab === 'wallet' && (
                            <div className="space-y-8 animate-fade-up">
                                <div className="bg-emerald-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Available for Settlement</p>
                                            <h2 className="text-6xl font-black tracking-tight">₹{user?.wallet?.balance || 0}</h2>
                                            <p className="text-xs text-emerald-300 font-bold mt-4 uppercase tracking-[0.2em]">Partner Profits</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <button onClick={() => alert('Payout request sent to Admin!')} className="px-8 py-4 bg-white text-emerald-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 hover:text-white transition-all transform active:scale-95 shadow-xl">Request Payout</button>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <Store size={120} />
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                                    <h4 className="font-black text-xl mb-8">Payout & Earnings History</h4>
                                    <div className="divide-y divide-slate-50">
                                        {transactions.length === 0 ? (
                                            <div className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">No financial records found</div>
                                        ) : (
                                            transactions.map(txn => (
                                                <div key={txn._id} className="py-6 flex justify-between items-center group hover:bg-slate-50 transition-colors px-4 rounded-2xl">
                                                    <div className="flex items-center gap-6">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${txn.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                            <Store size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900">{txn.description}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">#{txn.transactionId?.slice(-8)} • {new Date(txn.createdAt).toLocaleDateString()}</p>
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

                        {/* ─── OVERVIEW ─── */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {/* Revenue Chart */}
                                    <div className="lg:col-span-2 p-10 bg-emerald-950 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-100">
                                        <div className="flex justify-between items-start mb-8">
                                            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-emerald-400">Order Traffic</h4>
                                            <ArrowUpRight className="text-emerald-500" />
                                        </div>
                                        <div className="h-40 flex items-end gap-3 mb-6">
                                            {[40, 70, 45, 90, 65, 80, 40, 60, 55, 75, 50, 85].map((h, i) => (
                                                <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-xl opacity-90 transition-all hover:scale-110" />
                                            ))}
                                        </div>
                                        <p className="text-emerald-400/60 text-xs font-bold leading-relaxed italic">Your restaurant performance this week</p>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 flex flex-col gap-6 shadow-sm">
                                        <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Quick Actions</h4>
                                        <div className="space-y-3">
                                            <button onClick={() => setActiveTab('orders')} className="w-full flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100 group hover:bg-orange-600 transition-all">
                                                <span className="text-[10px] font-black uppercase text-orange-700 group-hover:text-white">Live Orders</span>
                                                <ArrowUpRight size={14} className="text-orange-500 group-hover:text-white" />
                                            </button>
                                            <button onClick={() => setActiveTab('menu')} className="w-full flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100 group hover:bg-purple-600 transition-all">
                                                <span className="text-[10px] font-black uppercase text-purple-700 group-hover:text-white">Menu Manager</span>
                                                <ArrowUpRight size={14} className="text-purple-500 group-hover:text-white" />
                                            </button>
                                            <button onClick={() => setActiveTab('restaurants')} className="w-full flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100 group hover:bg-emerald-600 transition-all">
                                                <span className="text-[10px] font-black uppercase text-emerald-700 group-hover:text-white">My Restaurants</span>
                                                <ArrowUpRight size={14} className="text-emerald-500 group-hover:text-white" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Business Insights Section */}
                                <div className="grid lg:grid-cols-2 gap-8">
                                    {/* Revenue Split Card */}
                                    <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm group">
                                        <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-8">Revenue Breakdown</h4>
                                        <div className="space-y-6">
                                            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center group/card">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Your Share (80%)</p>
                                                    <p className="text-3xl font-black text-emerald-700">₹{stats?.partnerEarnings?.toLocaleString() || 0}</p>
                                                    <p className="text-xs text-emerald-500 font-bold mt-1">Direct payout to your wallet</p>
                                                </div>
                                                <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center group-hover/card:rotate-12 transition-transform shadow-lg shadow-emerald-100">
                                                    <TrendingUp size={20} />
                                                </div>
                                            </div>
                                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group/card">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Platform Fee (20%)</p>
                                                    <p className="text-3xl font-black text-slate-700">₹{stats?.platformCommission?.toLocaleString() || 0}</p>
                                                    <p className="text-xs text-slate-400 font-bold mt-1">Platform maintainance fee</p>
                                                </div>
                                                <div className="w-12 h-12 bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center group-hover/card:-rotate-12 transition-transform">
                                                    <Package size={20} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-8 pt-8 border-t border-slate-50">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                                                <span>Net Revenue Growth</span>
                                                <span className="text-emerald-600">+12.5%</span>
                                            </div>
                                            <div className="h-3 bg-slate-50 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000 group-hover:w-[80%]" style={{ width: '80%' }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Popular Items Card */}
                                    <div className="p-10 bg-white rounded-[2.5rem] border border-white shadow-sm overflow-hidden relative group">
                                        <div className="relative z-10">
                                            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-8">Top Selling Dishes</h4>
                                            <div className="space-y-6">
                                                {menuItems.length > 0 ? (
                                                    menuItems.slice(0, 3).map((item, i) => (
                                                        <div key={item._id} className="flex justify-between items-center group/item">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm">
                                                                    <img src={item.image || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80`} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform" alt="" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-slate-900 text-sm">{item.name}</p>
                                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.category}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-black text-slate-900 text-sm">₹{item.price}</p>
                                                                <div className="w-20 bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${90 - i * 20}%` }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">No menu items found</div>
                                                )}
                                            </div>

                                            <button onClick={() => setActiveTab('menu')} className="w-full mt-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200">
                                                Go to Menu Manager
                                            </button>
                                        </div>
                                        <UtensilsCrossed size={180} className="absolute -bottom-10 -right-10 text-slate-50 -rotate-12 group-hover:scale-110 transition-transform duration-1000" />
                                    </div>
                                </div>

                                {/* Order Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                                        <p className="text-2xl font-black text-blue-700">{stats?.totalOrders || 0}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mt-1">Total Orders</p>
                                    </div>
                                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                                        <p className="text-2xl font-black text-emerald-700">{stats?.completedOrders || 0}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mt-1">Completed</p>
                                    </div>
                                    <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                                        <p className="text-2xl font-black text-rose-700">{stats?.cancelledOrders || 0}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 mt-1">Cancelled</p>
                                    </div>
                                </div>

                                {/* My Restaurants Summary */}
                                <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-8">Your Restaurants</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {restaurants.length === 0 ? (
                                            <div className="col-span-3 text-center py-8">
                                                <Store className="text-slate-300 mx-auto mb-3" size={40} />
                                                <p className="font-black text-slate-900 text-lg mb-2">No restaurants yet</p>
                                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Contact admin to register your first restaurant</p>
                                            </div>
                                        ) : (
                                            restaurants.map(r => (
                                                <div key={r._id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                                                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                                                        {r.image ? <img src={r.image} alt={r.name} className="w-full h-full object-cover" /> : <Store className="w-full h-full p-3 text-slate-300" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-slate-900 text-sm truncate">{r.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{r.cuisines?.join(', ') || 'Multi-cuisine'}</p>
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${r.isOpen ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                {r.isOpen ? 'Open' : 'Closed'}
                                                            </span>
                                                            <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${r.isApproved ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                {r.isApproved ? 'Approved' : 'Pending Approval'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── INSIGHTS ─── */}
                        {activeTab === 'insights' && <PartnerBI />}

                        {/* ─── LIVE ORDERS ─── */}
                        {activeTab === 'orders' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900">Incoming Orders</h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Accept, prepare, and mark ready</p>
                                    </div>
                                    <button onClick={fetchData} className="px-5 py-2.5 bg-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                                        Refresh
                                    </button>
                                </div>

                                {activeOrders.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                                        <ShoppingCart className="text-slate-300 mx-auto mb-4" size={40} />
                                        <p className="font-black text-slate-900 text-xl mb-2">No active orders</p>
                                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">New orders will appear here</p>
                                    </div>
                                ) : (
                                    activeOrders.map((order) => (
                                        <div key={order._id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs ${order.orderStatus === 'ready' ? 'bg-teal-500' :
                                                        order.orderStatus === 'preparing' ? 'bg-orange-500 animate-pulse' :
                                                            order.orderStatus === 'confirmed' ? 'bg-blue-500' : 'bg-yellow-500'
                                                        }`}>
                                                        {order.orderStatus === 'preparing' ? <Clock size={18} /> :
                                                            order.orderStatus === 'ready' ? <CheckCircle size={18} /> :
                                                                order.orderStatus?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900">Order #{(order.orderId || order._id)?.slice(-8)}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">₹{order.total} • {order.items?.length || 0} items</p>
                                                        <p className="text-[10px] text-slate-500 font-bold mt-1">Customer: {order.customer?.name || 'N/A'}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                                                    >
                                                        View Details
                                                    </button>
                                                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[order.orderStatus] || 'bg-slate-100 text-slate-600'}`}>
                                                        {order.orderStatus?.replace('_', ' ')}
                                                    </span>

                                                    {order.orderStatus === 'placed' && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleStatusUpdate(order._id, 'confirmed')}
                                                                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                                                            >
                                                                Accept Order
                                                            </button>
                                                            <button
                                                                onClick={() => handleStatusUpdate(order._id, 'cancelled')}
                                                                className="px-4 py-2 bg-rose-100 text-rose-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-200 transition-all"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                    {order.orderStatus === 'confirmed' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(order._id, 'preparing')}
                                                            className="px-4 py-2 bg-orange-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-orange-700 transition-all"
                                                        >
                                                            Start Preparing
                                                        </button>
                                                    )}
                                                    {order.orderStatus === 'preparing' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(order._id, 'ready')}
                                                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 transition-all"
                                                        >
                                                            Mark Ready
                                                        </button>
                                                    )}
                                                    {order.orderStatus === 'ready' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(order._id, 'picked_up')}
                                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 transition-all"
                                                        >
                                                            Mark Picked Up
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}

                                {/* All orders table */}
                                {ordersList.length > activeOrders.length && (
                                    <div className="mt-8">
                                        <h4 className="font-black text-lg text-slate-900 mb-4">Recent Orders History</h4>
                                        <div className="overflow-x-auto bg-white rounded-[2rem] border border-slate-100">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                                                        <th className="pb-6 px-6 pt-6">Order</th>
                                                        <th className="pb-6 pt-6">Total</th>
                                                        <th className="pb-6 pt-6">Status</th>
                                                        <th className="pb-6 pt-6">Customer</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {ordersList.filter(o => ['delivered', 'cancelled'].includes(o.orderStatus)).slice(0, 10).map(o => (
                                                        <tr key={o._id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-4 px-6 font-black text-slate-900 text-sm">#{(o.orderId || o._id)?.slice(-8)}</td>
                                                            <td className="py-4 font-black text-slate-900">₹{o.total?.toFixed(0)}</td>
                                                            <td className="py-4">
                                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[o.orderStatus]}`}>
                                                                    {o.orderStatus}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 text-sm text-slate-500 font-bold flex items-center justify-between">
                                                                <span>{o.customer?.name || 'N/A'}</span>
                                                                <button onClick={() => setSelectedOrder(o)} className="ml-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all">View</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── MENU ITEMS ─── */}
                        {activeTab === 'menu' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900">Menu Items</h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Manage your dishes and offerings</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowMenuForm(!showMenuForm);
                                            if (showMenuForm) { setEditingMenuId(null); setMenuForm({ name: '', price: '', category: 'Mains', description: '', image: '', restaurant: '', isVeg: true, isAvailable: true }); }
                                        }}
                                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl active:scale-95"
                                    >
                                        {showMenuForm ? <X size={16} /> : <Plus size={16} />}
                                        {showMenuForm ? 'Cancel' : 'Add Item'}
                                    </button>
                                </div>

                                {showMenuForm && (
                                    <form onSubmit={handleMenuSubmit} className="bg-white p-8 rounded-[2.5rem] border-2 border-emerald-100 shadow-xl animate-fade-up">
                                        <h4 className="font-black text-xl mb-6 flex items-center gap-3 text-slate-900">
                                            {editingMenuId ? 'Edit Menu Item' : 'New Menu Item'}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Item Name</label>
                                                <input required className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} placeholder="Margherita Pizza" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Price (₹)</label>
                                                <input required type="number" className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })} placeholder="299" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Category</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        required
                                                        className="flex-1 bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none cursor-pointer"
                                                        value={['Starters', 'Mains', 'Desserts', 'Beverages', 'Pizza', 'Pasta', 'Burgers', 'Sandwiches', 'Chinese', 'Indian', 'Tandoor', 'Continental', 'Fast Food', 'Healthy / Salads', 'Breakfast', 'Snacks', 'Combos'].includes(menuForm.category) ? menuForm.category : 'Other'}
                                                        onChange={e => {
                                                            if (e.target.value !== 'Other') {
                                                                setMenuForm({ ...menuForm, category: e.target.value });
                                                            }
                                                        }}
                                                    >
                                                        <option value="Starters">Starters</option>
                                                        <option value="Mains">Mains</option>
                                                        <option value="Desserts">Desserts</option>
                                                        <option value="Beverages">Beverages</option>
                                                        <option value="Pizza">Pizza</option>
                                                        <option value="Pasta">Pasta</option>
                                                        <option value="Burgers">Burgers</option>
                                                        <option value="Sandwiches">Sandwiches</option>
                                                        <option value="Chinese">Chinese</option>
                                                        <option value="Indian">Indian</option>
                                                        <option value="Tandoor">Tandoor</option>
                                                        <option value="Continental">Continental</option>
                                                        <option value="Fast Food">Fast Food</option>
                                                        <option value="Healthy / Salads">Healthy / Salads</option>
                                                        <option value="Breakfast">Breakfast</option>
                                                        <option value="Snacks">Snacks</option>
                                                        <option value="Combos">Combos</option>
                                                        <option value="Other">Other / Custom</option>
                                                    </select>
                                                    {(!['Starters', 'Mains', 'Desserts', 'Beverages', 'Pizza', 'Pasta', 'Burgers', 'Sandwiches', 'Chinese', 'Indian', 'Tandoor', 'Continental', 'Fast Food', 'Healthy / Salads', 'Breakfast', 'Snacks', 'Combos'].includes(menuForm.category) || menuForm.category === 'Other') && (
                                                        <input
                                                            required
                                                            className="flex-1 bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none"
                                                            value={menuForm.category === 'Other' ? '' : menuForm.category}
                                                            onChange={e => setMenuForm({ ...menuForm, category: e.target.value })}
                                                            placeholder="Type Category"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Restaurant Instance</label>
                                                <select
                                                    required
                                                    className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none cursor-pointer"
                                                    value={menuForm.restaurant}
                                                    onChange={e => setMenuForm({ ...menuForm, restaurant: e.target.value })}
                                                >
                                                    <option value="">Select Restaurant</option>
                                                    {restaurants.map(r => (
                                                        <option key={r._id} value={r._id}>{r.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Veg / Non-Veg</label>
                                                <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => setMenuForm({ ...menuForm, isVeg: true })}
                                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${menuForm.isVeg ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}
                                                    >
                                                        Veg
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMenuForm({ ...menuForm, isVeg: false })}
                                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!menuForm.isVeg ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400'}`}
                                                    >
                                                        Non-Veg
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <ImageUploadField
                                                    label="Dish Media"
                                                    value={menuForm.image}
                                                    onChange={(url) => setMenuForm({ ...menuForm, image: url })}
                                                    icon={ImageIcon}
                                                    required
                                                    hint="Upload a photo of your dish"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Description</label>
                                                <textarea required className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={menuForm.description} onChange={e => setMenuForm({ ...menuForm, description: e.target.value })} placeholder="A brief description of the dish..." rows={3} />
                                            </div>
                                        </div>
                                        <div className="mt-8 flex gap-4">
                                            <button type="submit" disabled={formLoading} className="py-4 px-8 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 active:scale-95 transition-all">
                                                {formLoading ? 'Saving...' : 'Save Item'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {menuItems.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                                        <UtensilsCrossed className="text-slate-300 mx-auto mb-4" size={40} />
                                        <p className="font-black text-slate-900 text-xl mb-2">No menu items yet</p>
                                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Add your first dish above</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {menuItems.map(item => (
                                            <div key={item._id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all group relative">
                                                <div className="absolute top-4 right-4 z-10 flex gap-2">
                                                    <button onClick={() => {
                                                        setEditingMenuId(item._id);
                                                        setMenuForm({
                                                            ...item,
                                                            restaurant: item.restaurant?._id || item.restaurant || ''
                                                        });
                                                        setShowMenuForm(true);
                                                    }} className="w-8 h-8 bg-white/90 backdrop-blur rounded-xl text-blue-600 flex items-center justify-center shadow-lg hover:bg-blue-600 hover:text-white transition-all">
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteMenuItem(item._id)}
                                                        className="w-8 h-8 bg-white/90 backdrop-blur rounded-xl text-rose-600 flex items-center justify-center shadow-lg hover:bg-rose-600 hover:text-white transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                {item.image ? (
                                                    <div className="h-36 overflow-hidden bg-slate-100">
                                                        <img src={item.image} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 ${!item.isAvailable && 'grayscale'}`} />
                                                    </div>
                                                ) : <div className="h-36 bg-slate-100 flex items-center justify-center"><UtensilsCrossed className="text-slate-300" /></div>}
                                                <div className="p-5">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className={`font-black ${!item.isAvailable ? 'text-slate-400' : 'text-slate-900'}`}>{item.name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.category}</span>
                                                                <span className="text-[8px] text-emerald-500 font-black uppercase tracking-tighter bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                                    {item.restaurant?.name || 'My Kitchen'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-black text-emerald-600">₹{item.price}</p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${item.isAvailable ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                            {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                                                        </span>
                                                        <button
                                                            onClick={() => toggleMenuItemStatus(item)}
                                                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${item.isAvailable ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                                        >
                                                            {item.isAvailable ? 'Mark Out of Stock' : 'Mark Available'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── HELP DESK ─── */}
                        {activeTab === 'help' && (
                            <div className="space-y-8">
                                <div className="grid lg:grid-cols-3 gap-8">
                                    {/* Create Request Form */}
                                    <div className="lg:col-span-1 p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl">
                                        <h3 className="text-xl font-black mb-1">New Support Request</h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8">Send a message to admin</p>

                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            setFormLoading(true);
                                            try {
                                                const res = await API.post('/support/create', { ...supportForm, role: 'restaurant' });
                                                setSupportRequests([res.data.data, ...supportRequests]);
                                                setSupportForm({ subject: '', message: '', priority: 'medium' });
                                                addToast('📨 Support request sent to admin');
                                            } catch (err) {
                                                addToast('Failed to send request', 'error');
                                            } finally {
                                                setFormLoading(false);
                                            }
                                        }} className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Subject</label>
                                                <input required className="w-full bg-slate-800/50 border border-white/10 px-6 py-3.5 rounded-xl font-bold text-white outline-none focus:border-indigo-500 transition-all text-sm" value={supportForm.subject} onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })} placeholder="Issue with an order..." />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Priority</label>
                                                <select className="w-full bg-slate-800/50 border border-white/10 px-6 py-3.5 rounded-xl font-bold text-white outline-none focus:border-indigo-500 transition-all text-sm cursor-pointer" value={supportForm.priority} onChange={e => setSupportForm({ ...supportForm, priority: e.target.value })}>
                                                    <option value="low">Low</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="high">High</option>
                                                    <option value="urgent">Urgent</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Message</label>
                                                <textarea required className="w-full bg-slate-800/50 border border-white/10 px-6 py-3.5 rounded-xl font-bold text-white outline-none focus:border-indigo-500 transition-all text-sm resize-none" rows={4} value={supportForm.message} onChange={e => setSupportForm({ ...supportForm, message: e.target.value })} placeholder="Describe the issue in detail..." />
                                            </div>
                                            <button type="submit" disabled={formLoading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50">
                                                {formLoading ? 'Sending...' : 'Send Request'}
                                            </button>
                                        </form>
                                    </div>

                                    {/* Previous Requests List */}
                                    <div className="lg:col-span-2 space-y-4">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="font-black text-xl text-slate-900">Your Support Requests</h3>
                                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{supportRequests.length} Total</span>
                                        </div>

                                        {supportRequests.length === 0 ? (
                                            <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                                                <Bell className="text-slate-300 mx-auto mb-4" size={40} />
                                                <p className="font-black text-slate-900 text-xl mb-2">No support requests</p>
                                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">When you have an issue, report it here.</p>
                                            </div>
                                        ) : (
                                            supportRequests.map(req => (
                                                <div key={req._id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`w-2 h-2 rounded-full ${req.status === 'open' ? 'bg-indigo-500' : req.status === 'resolved' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                                <h4 className="font-black text-slate-900">{req.subject}</h4>
                                                            </div>
                                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Submitted {new Date(req.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${req.priority === 'urgent' ? 'bg-rose-100 text-rose-600' : req.priority === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                {req.priority}
                                                            </span>
                                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${req.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                                                {req.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-slate-600 text-sm font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl">
                                                        {req.message}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── MY RESTAURANTS ─── */}
                        {activeTab === 'restaurants' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900">My Restaurants</h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Manage Profile & Timings</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowRestaurantForm(!showRestaurantForm);
                                            if (!showRestaurantForm) {
                                                setEditingRestaurantId(null);
                                                setRestaurantForm({ name: '', description: '', image: '', city: 'Mumbai', address: '', openTime: '10:00', closeTime: '22:00', isOpen: true, cuisines: [], averagePrice: 500 });
                                            }
                                        }}
                                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl active:scale-95"
                                    >
                                        {showRestaurantForm || editingRestaurantId ? <X size={16} /> : <Plus size={16} />}
                                        {showRestaurantForm || editingRestaurantId ? 'Cancel' : 'Add Restaurant'}
                                    </button>
                                </div>

                                {(showRestaurantForm || editingRestaurantId) && (
                                    <form onSubmit={handleRestaurantSubmit} className="bg-white p-8 rounded-[2.5rem] border-2 border-emerald-100 shadow-xl animate-fade-down">
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="font-black text-xl text-slate-900">{editingRestaurantId ? 'Edit Restaurant Profile' : 'Register New Restaurant'}</h4>
                                            <button type="button" onClick={() => { setEditingRestaurantId(null); setShowRestaurantForm(false); }} className="p-2 hover:bg-slate-100 rounded-full"><X size={16} /></button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Restaurant Name</label>
                                                <input required className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.name} onChange={e => setRestaurantForm({ ...restaurantForm, name: e.target.value })} placeholder="e.g. Spice Garden" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">City</label>
                                                <input required className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.city} onChange={e => setRestaurantForm({ ...restaurantForm, city: e.target.value })} placeholder="e.g. Mumbai" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Full Address</label>
                                                <input required className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.address} onChange={e => setRestaurantForm({ ...restaurantForm, address: e.target.value })} placeholder="e.g. Plot 42, Gourmet Street, Hitec City" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Cuisines (Comma-separated)</label>
                                                <input className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={Array.isArray(restaurantForm.cuisines) ? restaurantForm.cuisines.join(', ') : restaurantForm.cuisines || ''} onChange={e => setRestaurantForm({ ...restaurantForm, cuisines: e.target.value.split(',').map(c => c.trim()) })} placeholder="e.g. Pizza, Italian, Pasta" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <ImageUploadField
                                                    label="Restaurant Profile Image"
                                                    value={restaurantForm.image}
                                                    onChange={(url) => setRestaurantForm({ ...restaurantForm, image: url })}
                                                    icon={Store}
                                                    required
                                                    hint="Upload your restaurant's profile photo"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Opening Time</label>
                                                <input type="time" className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.openTime || '10:00'} onChange={e => setRestaurantForm({ ...restaurantForm, openTime: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Closing Time</label>
                                                <input type="time" className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.closeTime || '22:00'} onChange={e => setRestaurantForm({ ...restaurantForm, closeTime: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Avg Price for Two (₹)</label>
                                                <input type="number" className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.averagePrice || 500} onChange={e => setRestaurantForm({ ...restaurantForm, averagePrice: e.target.value })} placeholder="e.g. 500" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Description</label>
                                                <textarea className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.description} onChange={e => setRestaurantForm({ ...restaurantForm, description: e.target.value })} rows={3} />
                                            </div>
                                            <div className="md:col-span-2 flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Operational Status</p>
                                                    <p className="text-xs text-slate-500 font-medium">Turn off to temporarily stop accepting orders</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setRestaurantForm(prev => ({ ...prev, isOpen: !prev.isOpen }))}
                                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${restaurantForm.isOpen ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-300 text-slate-500'}`}
                                                >
                                                    {restaurantForm.isOpen ? 'Currently Open' : 'Currently Closed'}
                                                </button>
                                            </div>

                                            {/* Compliance Section */}
                                            <div className="md:col-span-2 pt-4 mt-4 border-t border-slate-100">
                                                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Compliance & Business Identity</p>
                                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                     <div>
                                                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">FSSAI License</label>
                                                         <input className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.fssaiLicense || ''} onChange={e => setRestaurantForm({ ...restaurantForm, fssaiLicense: e.target.value })} placeholder="14-digit number" />
                                                     </div>
                                                     <div>
                                                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">GSTIN</label>
                                                         <input className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.gstin || ''} onChange={e => setRestaurantForm({ ...restaurantForm, gstin: e.target.value })} placeholder="15-character ID" />
                                                     </div>
                                                     <div>
                                                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Business PAN</label>
                                                         <input className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.panNumber || ''} onChange={e => setRestaurantForm({ ...restaurantForm, panNumber: e.target.value })} placeholder="10-digit PAN" />
                                                     </div>
                                                 </div>
                                            </div>
                                        </div>
                                        <div className="mt-8">
                                            <button type="submit" disabled={formLoading} className="py-4 px-8 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 active:scale-95 transition-all w-full md:w-auto">
                                                {formLoading ? 'Saving...' : 'Update Profile'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {restaurants.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                                        <Store className="text-slate-300 mx-auto mb-4" size={40} />
                                        <p className="font-black text-slate-900 text-xl mb-2">No restaurants registered</p>
                                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Contact admin to register your restaurant</p>
                                    </div>
                                ) : (
                                    restaurants.map(r => (
                                        <div key={r._id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all relative">
                                            <button
                                                onClick={() => {
                                                    setEditingRestaurantId(r._id);
                                                    setShowRestaurantForm(true);
                                                    setRestaurantForm({
                                                        name: r.name, 
                                                        description: r.description, 
                                                        image: r.image, 
                                                        isOpen: r.isOpen,
                                                        city: r.location?.city || '', 
                                                        address: r.location?.address || '',
                                                        openTime: r.openingHours?.open || '10:00', 
                                                        closeTime: r.openingHours?.close || '22:00',
                                                        cuisines: r.cuisines || [],
                                                        averagePrice: r.averagePrice || 500,
                                                        fssaiLicense: r.fssaiLicense || '',
                                                        gstin: r.gstin || '',
                                                        panNumber: r.panNumber || ''
                                                    });
                                                }}
                                                className="absolute top-6 right-6 z-10 w-10 h-10 bg-white shadow-xl rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <div className="flex flex-col md:flex-row">
                                                <div className="md:w-64 h-48 md:h-auto bg-slate-100 overflow-hidden shrink-0">
                                                    {r.image ? <img src={r.image} alt={r.name} className={`w-full h-full object-cover ${!r.isOpen && 'grayscale opacity-70'}`} /> : <div className="w-full h-full flex items-center justify-center"><Store size={40} className="text-slate-300" /></div>}
                                                </div>
                                                <div className="p-8 flex-1">
                                                    <div className="flex justify-between items-start pr-12">
                                                        <div>
                                                            <h3 className="text-2xl font-black text-slate-900">{r.name}</h3>
                                                            <p className="text-slate-400 text-sm font-medium mt-1">{r.description}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
                                                                <Clock size={12} /> {r.openingHours?.open || '10:00'} - {r.openingHours?.close || '22:00'}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${r.isOpen ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                {r.isOpen ? 'Open' : 'Closed'}
                                                            </span>
                                                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${r.isApproved ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                {r.isApproved ? 'Approved' : 'Pending Approval'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ─── NOTIFICATIONS ─── */}
                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900">Notifications</h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Updates on your orders and account</p>
                                    </div>
                                    {persistentNotifications.length > 0 && (
                                        <button
                                            onClick={handleClearNotifications}
                                            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-200"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>

                                {persistentNotifications.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                                        <Bell className="text-slate-300 mx-auto mb-4" size={40} />
                                        <p className="font-black text-slate-900 text-xl mb-2">Clean slate!</p>
                                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">You're all caught up with notifications</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {persistentNotifications.map(notif => (
                                            <div key={notif._id} className={`p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-start gap-6 relative overflow-hidden group ${!notif.read ? 'border-l-4 border-l-orange-500' : ''}`}>
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                                                    notif.type === 'error' ? 'bg-rose-50 text-rose-600' :
                                                        'bg-blue-50 text-blue-600'
                                                    }`}>
                                                    <Bell size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-black text-slate-900 text-lg leading-tight">{notif.title}</h4>
                                                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{new Date(notif.createdAt).toLocaleString()}</p>
                                                    </div>
                                                    <p className="text-slate-500 text-sm font-medium mt-1 leading-relaxed">{notif.message}</p>
                                                    {notif.orderId && (
                                                        <button
                                                            onClick={() => {
                                                                setActiveTab('orders');
                                                                window.scrollTo({ top: 300, behavior: 'smooth' });
                                                            }}
                                                            className="inline-flex items-center gap-2 mt-4 text-[10px] font-black text-orange-600 uppercase tracking-widest hover:gap-3 transition-all"
                                                        >
                                                            View Order Details <ArrowRight size={12} className="ml-1" />
                                                        </button>
                                                    )}
                                                </div>
                                                {!notif.read && (
                                                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in transition-all">
                    <div className="bg-white max-w-2xl w-full rounded-[2.5rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedOrder(null)}
                            className="absolute top-6 right-6 w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-all"
                        >
                            <X size={18} />
                        </button>
                        
                        <div className="flex items-center gap-4 mb-8 pr-12">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black shrink-0 ${selectedOrder.orderStatus === 'ready' ? 'bg-teal-500' :
                                selectedOrder.orderStatus === 'preparing' ? 'bg-orange-500 animate-pulse' :
                                selectedOrder.orderStatus === 'confirmed' ? 'bg-blue-500' : 'bg-yellow-500'
                            }`}>
                                <Package size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 break-all">Order #{(selectedOrder.orderId || selectedOrder._id)?.slice(-8)}</h2>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black text-white ${STATUS_COLORS[selectedOrder.orderStatus] || 'bg-slate-400'}`}>
                                        {selectedOrder.orderStatus?.replace('_', ' ')}
                                    </span>
                                    • {new Date(selectedOrder.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                    Customer Details
                                </h3>
                                <p className="font-black text-slate-900 text-lg">{selectedOrder.customer?.name || 'N/A'}</p>
                                <p className="text-sm font-bold text-slate-500 mt-1">{selectedOrder.customer?.phone || 'No phone provided'}</p>
                            </div>
                            
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                    Delivery Address
                                </h3>
                                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                                    {selectedOrder.deliveryAddress?.street || 'No street provided'}, {selectedOrder.deliveryAddress?.city || 'No city'}
                                    {selectedOrder.deliveryAddress?.zipCode ? ` - ${selectedOrder.deliveryAddress?.zipCode}` : ''}
                                </p>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-4">Order Items</h3>
                            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                <div className="divide-y divide-slate-50">
                                    {selectedOrder.items?.map((item, idx) => (
                                        <div key={idx} className="p-4 flex justify-between items-center group hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs shrink-0">
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm">{item.name}</p>
                                                    {item.addOns?.length > 0 && (
                                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 max-w-[200px] truncate">
                                                            + {item.addOns.map(a => a.name).join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="font-black text-emerald-600 whitespace-nowrap ml-4">₹{item.price * item.quantity}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center">
                                    <span className="font-black text-xs uppercase tracking-widest text-slate-500">Total Bill</span>
                                    <span className="font-black text-xl text-slate-900">₹{selectedOrder.total?.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {selectedOrder.specialInstructions && (
                            <div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-100 mb-8">
                                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-yellow-700 mb-2">Special Instructions</h3>
                                <p className="text-sm font-bold text-yellow-800 italic">"{selectedOrder.specialInstructions}"</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                            {selectedOrder.orderStatus === 'placed' && (
                                <>
                                    <button
                                        onClick={() => { handleStatusUpdate(selectedOrder._id, 'cancelled'); setSelectedOrder(null); }}
                                        className="px-6 py-3 bg-rose-100 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-200 transition-all"
                                    >
                                        Reject Order
                                    </button>
                                    <button
                                        onClick={() => { handleStatusUpdate(selectedOrder._id, 'confirmed'); setSelectedOrder({...selectedOrder, orderStatus: 'confirmed'}); }}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                                    >
                                        Accept Order
                                    </button>
                                </>
                            )}
                            {selectedOrder.orderStatus === 'confirmed' && (
                                <button
                                    onClick={() => { handleStatusUpdate(selectedOrder._id, 'preparing'); setSelectedOrder({...selectedOrder, orderStatus: 'preparing'}); }}
                                    className="px-6 py-3 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
                                >
                                    Start Preparing
                                </button>
                            )}
                            {selectedOrder.orderStatus === 'preparing' && (
                                <button
                                    onClick={() => { handleStatusUpdate(selectedOrder._id, 'ready'); setSelectedOrder({...selectedOrder, orderStatus: 'ready'}); }}
                                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                                >
                                    Mark Ready
                                </button>
                            )}
                            {['ready', 'picked_up', 'on_the_way', 'delivered', 'cancelled'].includes(selectedOrder.orderStatus) && (
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                                >
                                    Close Details
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
