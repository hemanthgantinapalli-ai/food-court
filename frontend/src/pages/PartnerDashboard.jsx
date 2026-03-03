import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, ShoppingCart, TrendingUp, UtensilsCrossed, ArrowUpRight, Bell, Plus, Trash2, Edit3, X, CheckCircle, Clock, Package } from 'lucide-react';
import Loader from '../components/Loader';
import { useAuthStore } from '../context/authStore';
import API from '../api/axios';

const STATUS_COLORS = {
    placed: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-orange-100 text-orange-700',
    ready: 'bg-teal-100 text-teal-700',
    on_the_way: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
};

export default function PartnerDashboard() {
    const { user, logout } = useAuthStore();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [ordersList, setOrdersList] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [notifications, setNotifications] = useState([]);

    const [formLoading, setFormLoading] = useState(false);
    const [showMenuForm, setShowMenuForm] = useState(false);
    const [editingMenuId, setEditingMenuId] = useState(null);
    const [menuForm, setMenuForm] = useState({ name: '', price: '', category: 'Mains', description: '', image: '', restaurant: '', isVeg: true, isAvailable: true });

    const [editingRestaurantId, setEditingRestaurantId] = useState(null);
    const [showRestaurantForm, setShowRestaurantForm] = useState(false);
    const [restaurantForm, setRestaurantForm] = useState({ name: '', description: '', image: '', openTime: '10:00', closeTime: '22:00', isOpen: true });

    const addNotif = (msg, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [{ id, msg, type }, ...prev].slice(0, 10));
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
    };

    useEffect(() => {
        if (user?.role === 'restaurant') {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        const isInitialLoad = !stats;
        if (isInitialLoad) setLoading(true);
        try {
            const [statsRes, ordersRes, menuRes, restRes] = await Promise.all([
                API.get('/partner/stats'),
                API.get('/partner/orders'),
                API.get('/partner/menu'),
                API.get('/partner/my-restaurants'),
            ]);
            setStats(statsRes.data.data);
            setOrdersList(ordersRes.data.data);
            setMenuItems(menuRes.data.data);
            setRestaurants(restRes.data.data);
        } catch (error) {
            console.error('Error fetching partner data:', error);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    };

    const handleStatusUpdate = async (orderId, status) => {
        try {
            await API.put(`/partner/orders/${orderId}/status`, { status });
            setOrdersList(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: status } : o));
            addNotif(`✅ Order status updated to ${status}`, 'info');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update');
        }
    };

    const handleMenuSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            if (editingMenuId) {
                const response = await API.put(`/menu/${editingMenuId}`, menuForm);
                setMenuItems(menuItems.map(i => i._id === editingMenuId ? response.data.data : i));
                addNotif('🍲 Menu item updated');
            } else {
                const response = await API.post('/menu', { ...menuForm, restaurant: menuForm.restaurant || restaurants[0]?._id });
                setMenuItems([response.data.data, ...menuItems]);
                addNotif('🍲 Menu item added');
            }
            setShowMenuForm(false);
            setEditingMenuId(null);
            setMenuForm({ name: '', price: '', category: 'Mains', description: '', image: '', restaurant: '', isVeg: true, isAvailable: true });
        } catch (error) {
            addNotif(error.response?.data?.message || 'Failed to save item', 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const toggleMenuItemStatus = async (item) => {
        try {
            const response = await API.put(`/menu/${item._id}`, { isAvailable: !item.isAvailable });
            setMenuItems(menuItems.map(i => i._id === item._id ? { ...i, isAvailable: response.data.data.isAvailable } : i));
        } catch (error) {
            addNotif('Failed to toggle availability', 'error');
        }
    };

    const handleRestaurantSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const payload = { ...restaurantForm };
            if (payload.openTime && payload.closeTime) {
                payload.openingHours = { open: payload.openTime, close: payload.closeTime };
            }
            if (editingRestaurantId) {
                const response = await API.put(`/restaurants/${editingRestaurantId}`, payload);
                setRestaurants(restaurants.map(r => r._id === editingRestaurantId ? response.data.data : r));
                addNotif('🏪 Restaurant updated successfully');
            } else {
                const response = await API.post('/restaurants', payload);
                setRestaurants([response.data.data, ...restaurants]);
                addNotif('🏪 Restaurant submitted for approval');
            }
            setEditingRestaurantId(null);
            setShowRestaurantForm(false);
        } catch (error) {
            addNotif(error.response?.data?.message || 'Update failed', 'error');
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
        { label: 'Total Revenue', value: `₹${stats?.totalRevenue?.toLocaleString() || 0}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Live Orders', value: activeOrders.length, icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Menu Items', value: stats?.totalMenuItems || 0, icon: UtensilsCrossed, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    return (
        <div className="min-h-screen bg-[#F8F9FB] pt-24 pb-12">

            {/* Toast Notifications */}
            <div className="fixed top-6 right-6 z-50 space-y-2 max-w-xs w-full">
                {notifications.map(n => (
                    <div key={n.id} className="px-5 py-4 rounded-2xl shadow-2xl font-black text-sm text-white bg-emerald-600 transition-all">
                        {n.msg}
                    </div>
                ))}
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 mb-8 border border-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">Partner <span className="text-emerald-600">Dashboard</span></h1>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Manage your restaurant business</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {activeOrders.length > 0 && (
                            <div className="relative flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-2xl">
                                <Bell className="text-orange-500 animate-bounce" size={18} />
                                <span className="font-black text-orange-700 text-xs uppercase tracking-widest">{activeOrders.length} Active</span>
                            </div>
                        )}
                        <button
                            onClick={() => { logout(); window.location.href = '/restaurant/login'; }}
                            className="px-5 py-2.5 bg-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all"
                        >
                            Sign Out
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
                            { id: 'orders', label: `Live Orders${activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}` },
                            { id: 'menu', label: 'Menu Items' },
                            { id: 'restaurants', label: 'My Restaurants' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                            >
                                {tab.id === 'orders' && activeOrders.length > 0 && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-8 md:p-12">

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
                                                            <td className="py-4 text-sm text-slate-500 font-bold">{o.customer?.name || 'N/A'}</td>
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
                                                <select className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={menuForm.category} onChange={e => setMenuForm({ ...menuForm, category: e.target.value })}>
                                                    <option>Starters</option><option>Mains</option><option>Desserts</option><option>Beverages</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Image URL</label>
                                                <input className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={menuForm.image} onChange={e => setMenuForm({ ...menuForm, image: e.target.value })} placeholder="https://..." />
                                                {menuForm.image && (
                                                    <div className="mt-4 rounded-xl overflow-hidden h-32 bg-slate-100 border border-slate-100 shadow-inner">
                                                        <img src={menuForm.image} alt="Menu Preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} onLoad={(e) => { e.target.style.display = 'block'; }} />
                                                    </div>
                                                )}
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
                                                    <button onClick={() => { setEditingMenuId(item._id); setMenuForm(item); setShowMenuForm(true); }} className="w-8 h-8 bg-white/90 backdrop-blur rounded-xl text-blue-600 flex items-center justify-center shadow-lg hover:bg-blue-600 hover:text-white transition-all">
                                                        <Edit3 size={14} />
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
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.category}</p>
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
                                                setRestaurantForm({ name: '', description: '', image: '', openTime: '10:00', closeTime: '22:00', isOpen: true });
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
                                                <input className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.name} onChange={e => setRestaurantForm({ ...restaurantForm, name: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Cover Image URL</label>
                                                <input className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.image} onChange={e => setRestaurantForm({ ...restaurantForm, image: e.target.value })} />
                                                {restaurantForm.image && (
                                                    <div className="mt-4 rounded-xl overflow-hidden h-32 bg-slate-100 border border-slate-100 shadow-inner">
                                                        <img src={restaurantForm.image} alt="Restaurant Preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} onLoad={(e) => { e.target.style.display = 'block'; }} />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Opening Time</label>
                                                <input type="time" className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.openTime || '10:00'} onChange={e => setRestaurantForm({ ...restaurantForm, openTime: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Closing Time</label>
                                                <input type="time" className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" value={restaurantForm.closeTime || '22:00'} onChange={e => setRestaurantForm({ ...restaurantForm, closeTime: e.target.value })} />
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
                                                        name: r.name, description: r.description, image: r.image, isOpen: r.isOpen,
                                                        openTime: r.openingHours?.open || '10:00', closeTime: r.openingHours?.close || '22:00'
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

                    </div>
                </div>
            </div>
        </div>
    );
}
