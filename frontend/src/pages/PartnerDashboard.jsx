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
                                                        <button
                                                            onClick={() => handleStatusUpdate(order._id, 'confirmed')}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                                                        >
                                                            Accept Order
                                                        </button>
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
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900">Menu Items</h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Manage your dishes and offerings</p>
                                    </div>
                                </div>

                                {menuItems.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                                        <UtensilsCrossed className="text-slate-300 mx-auto mb-4" size={40} />
                                        <p className="font-black text-slate-900 text-xl mb-2">No menu items yet</p>
                                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Contact admin to add items to your menu</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {menuItems.map(item => (
                                            <div key={item._id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                                                {item.image && (
                                                    <div className="h-36 overflow-hidden">
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    </div>
                                                )}
                                                <div className="p-5">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-black text-slate-900">{item.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.category} • {item.restaurant?.name}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-black text-emerald-600">₹{item.price}</p>
                                                            {item.discountPrice && <p className="text-[10px] text-slate-400 line-through">₹{item.discountPrice}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex items-center gap-2">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${item.isAvailable ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                            {item.isAvailable ? 'Available' : 'Unavailable'}
                                                        </span>
                                                        {item.isVeg && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-green-50 text-green-600">Veg</span>}
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
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900">My Restaurants</h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Your registered restaurants on FoodCourt</p>
                                    </div>
                                </div>

                                {restaurants.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                                        <Store className="text-slate-300 mx-auto mb-4" size={40} />
                                        <p className="font-black text-slate-900 text-xl mb-2">No restaurants registered</p>
                                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Contact admin to register your restaurant</p>
                                    </div>
                                ) : (
                                    restaurants.map(r => (
                                        <div key={r._id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                                            <div className="flex flex-col md:flex-row">
                                                <div className="md:w-64 h-48 md:h-auto bg-slate-100 overflow-hidden shrink-0">
                                                    {r.image ? <img src={r.image} alt={r.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Store size={40} className="text-slate-300" /></div>}
                                                </div>
                                                <div className="p-8 flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="text-2xl font-black text-slate-900">{r.name}</h3>
                                                            <p className="text-slate-400 text-sm font-medium mt-1">{r.description}</p>
                                                            <div className="flex flex-wrap gap-2 mt-3">
                                                                {r.cuisines?.map((c, i) => (
                                                                    <span key={i} className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">{c}</span>
                                                                ))}
                                                            </div>
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
                                                    <div className="mt-6 flex gap-6">
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Rating</p>
                                                            <p className="font-black text-slate-900 text-lg">{r.rating}★</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Delivery</p>
                                                            <p className="font-black text-slate-900 text-lg">{r.deliveryTime} min</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Fee</p>
                                                            <p className="font-black text-slate-900 text-lg">₹{r.deliveryFee}</p>
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
