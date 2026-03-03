import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Users, ShoppingCart, TrendingUp, Building, ArrowUpRight, AlertCircle, Bell, Truck, Plus, Trash2, Edit3, X } from 'lucide-react';
import Loader from '../components/Loader';
import { useAuthStore } from '../context/authStore';
import { useOrderStore } from '../store/orderStore';
import API from '../api/axios';
import { socket, connectSocket } from '../api/socket.js';

const STATUS_COLORS = {
  placed: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready: 'bg-teal-100 text-teal-700',
  on_the_way: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [restaurantsList, setRestaurantsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]); // real-time new orders
  const [notifications, setNotifications] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [ridersList, setRidersList] = useState([]);
  const [assigningRider, setAssigningRider] = useState(null);
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [newRestaurantForm, setNewRestaurantForm] = useState({
    name: '',
    description: '',
    image: '',
    cuisines: '',
    address: '',
    city: '',
    ownerId: ''
  });
  const [isSubmittingRest, setIsSubmittingRest] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  const [financeData, setFinanceData] = useState({ totalGrossRevenue: 0, totalCommission: 0, weeklyReport: [], settlements: [] });

  const addNotif = (msg, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [{ id, msg, type }, ...prev].slice(0, 10));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();

      // Connect socket & join admins room
      if (user?._id) {
        connectSocket(user._id);
        socket.emit('join_role', 'admins');
      }

      // ── Real-time event handlers ──
      socket.on('new_order', (data) => {
        console.log('🆕 New order received by admin:', data);
        addNotif(`🛒 New Order #${(data.orderId || data._id)?.slice(-6)} — ₹${data.total}`, 'order');
        setLiveOrders(prev => [data, ...prev]);
        setStats(prev => prev ? { ...prev, totalOrders: (prev.totalOrders || 0) + 1 } : prev);
      });

      socket.on('order_claimed', (data) => {
        console.log('🛵 Order claimed by rider:', data);
        addNotif(`🛵 Rider ${data.rider?.name || 'Unknown'} picked up Order #${data.orderId?.toString().slice(-6)}`, 'rider');
        // Update liveOrders list with rider info
        setLiveOrders(prev =>
          prev.map(o => o._id === data.orderId?.toString()
            ? { ...o, orderStatus: 'on_the_way', rider: data.rider }
            : o
          )
        );
        // Update main orders list too
        setOrdersList(prev =>
          prev.map(o => o._id === data.orderId?.toString()
            ? { ...o, orderStatus: 'on_the_way', rider: data.rider }
            : o
          )
        );
      });

      socket.on('order_status_update', (data) => {
        if (data.forAdmin) {
          setOrdersList(prev =>
            prev.map(o => o._id === data.orderId?.toString()
              ? { ...o, orderStatus: data.status }
              : o
            )
          );
          setLiveOrders(prev =>
            prev.map(o => o._id === data.orderId?.toString()
              ? { ...o, orderStatus: data.status }
              : o
            )
          );
          if (data.status === 'delivered') {
            addNotif(`✅ Order #${data.orderId?.toString().slice(-6)} delivered!`, 'delivered');
          }
        }
      });

      return () => {
        socket.off('new_order');
        socket.off('order_claimed');
        socket.off('order_status_update');
      };
    }
  }, [user]);

  const fetchData = async () => {
    // Only show loader if we don't have data yet to prevent flickering on updates
    const isInitialLoad = !stats || usersList.length === 0;
    if (isInitialLoad) setLoading(true);

    try {
      const [statsRes, usersRes, restRes, ordersRes, supportRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/users'),
        API.get('/admin/restaurants'),
        API.get('/admin/orders'),
        API.get('/support/my-requests'),
      ]);
      setStats(statsRes.data.data);
      setUsersList(usersRes.data.data);
      setRestaurantsList(restRes.data.data);
      setOrdersList(ordersRes.data.data);
      setSupportTickets(supportRes.data.data);
      setRidersList(usersRes.data.data.filter(u => u.role === 'rider'));
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  const handleCreateRestaurant = async (e) => {
    e.preventDefault();
    setIsSubmittingRest(true);
    try {
      const payload = {
        name: newRestaurantForm.name,
        description: newRestaurantForm.description,
        image: newRestaurantForm.image,
        cuisines: newRestaurantForm.cuisines.split(',').map(c => c.trim()).filter(c => c !== ''),
        location: {
          address: newRestaurantForm.address,
          city: newRestaurantForm.city
        },
        owner: newRestaurantForm.ownerId || null
      };

      if (editingId) {
        const res = await API.put(`/restaurants/${editingId}`, payload);
        setRestaurantsList(prev => prev.map(r => r._id === editingId ? res.data.data : r));
        addNotif('✨ Restaurant updated successfully!', 'info');
      } else {
        const res = await API.post('/restaurants', payload);
        setRestaurantsList(prev => [res.data.data, ...prev]);
        addNotif('🏪 Restaurant added successfully!', 'info');
      }

      setShowAddRestaurant(false);
      setEditingId(null);
      setNewRestaurantForm({ name: '', description: '', image: '', cuisines: '', address: '', city: '', ownerId: '' });
    } catch (err) {
      console.error('Failed to create restaurant:', err);
      alert(err.response?.data?.message || 'Error adding restaurant');
    } finally {
      setIsSubmittingRest(false);
    }
  };

  const handleDeleteRestaurant = async (id) => {
    if (!window.confirm('Delete this restaurant forever?')) return;
    try {
      await API.delete(`/restaurants/${id}`);
      setRestaurantsList(prev => prev.filter(r => r._id !== id));
      addNotif('🗑️ Restaurant deleted', 'info');
    } catch (err) {
      alert('Delete failed');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <div className="text-center bg-white p-12 rounded-[2rem] shadow-sm border border-slate-100 max-w-sm w-full mx-4 font-sans">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-500 font-medium">You do not have permission to view the Admin Dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) return <Loader />;

  const activeOrders = ordersList.filter(o => !['delivered', 'cancelled'].includes(o.orderStatus));

  const statCards = [
    { label: 'Total Revenue', value: `₹${stats?.totalRevenue?.toLocaleString() || 0}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Live Orders', value: activeOrders.length || 0, icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Kitchens', value: stats?.totalRestaurants || 0, icon: Building, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] pt-24 pb-12">

      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-50 space-y-2 max-w-xs w-full">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`px-5 py-4 rounded-2xl shadow-2xl font-black text-sm text-white transition-all ${n.type === 'order' ? 'bg-orange-600' :
              n.type === 'rider' ? 'bg-indigo-600' :
                n.type === 'delivered' ? 'bg-emerald-600' : 'bg-slate-900'
              }`}
          >
            {n.msg}
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 mb-8 border border-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">Admin <span className="text-orange-600">Panel</span></h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Manage users, orders, and restaurants</p>
          </div>
          <div className="flex items-center gap-4">
            {liveOrders.length > 0 && (
              <div className="relative flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-2xl">
                <Bell className="text-orange-500 animate-bounce" size={18} />
                <span className="font-black text-orange-700 text-xs uppercase tracking-widest">{liveOrders.length} Live</span>
              </div>
            )}
            <div className="flex items-center gap-4 bg-white/50 p-4 rounded-3xl border border-white">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 bg-emerald-600 rounded-full" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Status</p>
                <p className="font-black text-slate-900">HEALTHY</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white rounded-[2rem] p-8 border border-white shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2">{stat.label}</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter group-hover:text-orange-600 transition-colors">{stat.value}</p>
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
              { id: 'live', label: `Live Orders${activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}` },
              { id: 'orders', label: 'All Orders' },
              { id: 'approvals', label: `Approvals ${restaurantsList.filter(r => !r.isApproved).length > 0 ? `(${restaurantsList.filter(r => !r.isApproved).length})` : ''}` },
              { id: 'finance', label: 'Finance' },
              { id: 'support', label: `Support ${supportTickets.filter(t => t.status === 'open').length > 0 ? `(${supportTickets.filter(t => t.status === 'open').length})` : ''}` },
              { id: 'users', label: 'Users' },
              { id: 'restaurants', label: 'Restaurants' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
              >
                {(tab.id === 'live' && activeOrders.length > 0) || (tab.id === 'approvals' && restaurantsList.filter(r => !r.isApproved).length > 0) ? (
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                ) : null}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-8 md:p-12">

            {/* ─── OVERVIEW ─── */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {stats?.unapprovedRestaurants > 0 && (
                  <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-4">
                      <AlertCircle className="text-amber-600" size={24} />
                      <div>
                        <p className="font-black text-amber-900 uppercase tracking-widest text-xs">{stats.unapprovedRestaurants} Kitchens Pending Approval</p>
                        <p className="text-[10px] text-amber-600 font-bold uppercase mt-0.5">They won't appear on the home page until verified.</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('restaurants')} className="bg-amber-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all">
                      Review Now
                    </button>
                  </div>
                )}

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* Traffic Chart */}
                  <div className="lg:col-span-2 p-10 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200">
                    <div className="flex justify-between items-start mb-8">
                      <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Order Traffic</h4>
                      <ArrowUpRight className="text-orange-500" />
                    </div>
                    <div className="h-40 flex items-end gap-3 mb-6">
                      {[40, 70, 45, 90, 65, 80, 40, 60, 55, 75, 50, 85].map((h, i) => (
                        <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-gradient-to-t from-orange-600 to-orange-400 rounded-xl opacity-90 transition-all hover:scale-110" />
                      ))}
                    </div>
                    <p className="text-slate-400 text-xs font-bold leading-relaxed italic">Real-time platform activity monitoring</p>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 flex flex-col gap-6 shadow-sm">
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Quick Actions</h4>
                    <div className="space-y-3">
                      <button onClick={() => setActiveTab('live')} className="w-full flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100 group hover:bg-orange-600 transition-all">
                        <span className="text-[10px] font-black uppercase text-orange-700 group-hover:text-white">Live Tracking</span>
                        <ArrowUpRight size={14} className="text-orange-500 group-hover:text-white" />
                      </button>
                      <button onClick={() => setActiveTab('restaurants')} className="w-full flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100 group hover:bg-purple-600 transition-all">
                        <span className="text-[10px] font-black uppercase text-purple-700 group-hover:text-white">Kitchen Portal</span>
                        <ArrowUpRight size={14} className="text-purple-500 group-hover:text-white" />
                      </button>
                      <Link to="/admin/menu" className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100 group hover:bg-blue-600 transition-all">
                        <span className="text-[10px] font-black uppercase text-blue-700 group-hover:text-white">Global Menu</span>
                        <ArrowUpRight size={14} className="text-blue-500 group-hover:text-white" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Status Cards */}
                <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-8">Infrastructure Health</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest p-5 bg-white rounded-2xl border border-slate-100 text-emerald-600 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" /> Core System: Operational
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest p-5 bg-white rounded-2xl border border-slate-100 text-blue-600 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-600" /> Gateway: Secure
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest p-5 bg-white rounded-2xl border border-slate-100 text-indigo-600 shadow-sm">
                      <Truck size={12} /> Active Couriers: {ridersList.length}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── LIVE ORDERS ─── */}
            {activeTab === 'live' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">Live Order Tracker</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Real-time updates via Socket.IO</p>
                  </div>
                  <button onClick={fetchData} className="px-5 py-2.5 bg-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-all">
                    Refresh
                  </button>
                </div>

                {activeOrders.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <ShoppingCart className="text-slate-300 mx-auto mb-4" size={40} />
                    <p className="font-black text-slate-900 text-xl mb-2">No active orders</p>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">New orders will appear here in real-time</p>
                  </div>
                ) : (
                  activeOrders.map((order) => (
                    <div key={order._id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs ${order.orderStatus === 'on_the_way' ? 'bg-indigo-500 animate-pulse' :
                            order.orderStatus === 'preparing' ? 'bg-orange-500' : 'bg-blue-500'
                            }`}>
                            {order.orderStatus === 'on_the_way' ? <Truck size={18} /> : order.orderStatus?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">Order #{(order.orderId || order._id)?.slice(-8)}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{order.restaurant?.name} • ₹{order.total}</p>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">Customer: {order.customer?.name || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Rider Info */}
                        <div className="flex flex-col items-start md:items-center gap-1">
                          {order.rider ? (
                            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl">
                              <Truck size={14} className="text-indigo-600" />
                              <div>
                                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{order.rider?.name || 'Rider Assigned'}</p>
                                {order.rider?.phone && <p className="text-[10px] text-indigo-400 font-bold">{order.rider.phone}</p>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                              Pending Assignment
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Manual Rider Assignment Dropdown */}
                          {!order.rider && (
                            <div className="relative">
                              <select
                                onChange={async (e) => {
                                  const riderId = e.target.value;
                                  if (!riderId) return;
                                  try {
                                    await API.post(`/admin/orders/${order._id}/assign`, { riderId });
                                    addNotif(`🛵 Assigned to rider!`, 'info');
                                    fetchData();
                                  } catch (err) {
                                    alert('Failed to assign rider');
                                  }
                                }}
                                className="bg-orange-50 text-orange-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-orange-200 focus:ring-1 focus:ring-orange-500 outline-none cursor-pointer"
                              >
                                <option value="">Assign Rider</option>
                                {ridersList.map(r => (
                                  <option key={r._id} value={r._id}>{r.name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[order.orderStatus] || 'bg-slate-100 text-slate-600'}`}>
                            {order.orderStatus?.replace('_', ' ')}
                          </span>
                          {/* Admin can manually change status */}
                          <select
                            value={order.orderStatus}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              try {
                                await useOrderStore.getState().updateStatus(order._id, newStatus);
                                setOrdersList(prev => prev.map(item => item._id === order._id ? { ...item, orderStatus: newStatus } : item));
                              } catch (err) {
                                console.error('Update failed:', err);
                              }
                            }}
                            className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-orange-500 outline-none cursor-pointer"
                          >
                            {['placed', 'confirmed', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled'].map(s => (
                              <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                          </select>
                          <Link to={`/order/${order._id}`} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-orange-600 transition-all">
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ─── ALL ORDERS ─── */}
            {activeTab === 'orders' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                      <th className="pb-6 px-4">Order</th>
                      <th className="pb-6">Price</th>
                      <th className="pb-6">Rider</th>
                      <th className="pb-6">Status</th>
                      <th className="pb-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ordersList.map((o) => (
                      <tr key={o._id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-6 px-4">
                          <p className="font-black text-slate-900 text-sm">#{(o.orderId || o._id)?.slice(-8)}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{o.restaurant?.name || 'Restaurant'}</p>
                          <p className="text-[10px] text-slate-500 font-bold">{o.customer?.name}</p>
                        </td>
                        <td className="py-6">
                          <p className="font-black text-slate-900">₹{o.total?.toFixed(0)}</p>
                        </td>
                        <td className="py-6">
                          {o.rider ? (
                            <div className="flex items-center gap-2">
                              <Truck size={12} className="text-indigo-500" />
                              <div>
                                <p className="font-black text-slate-800 text-xs">{o.rider?.name || 'Assigned'}</p>
                                {o.rider?.phone && <p className="text-[10px] text-slate-400 font-bold">{o.rider.phone}</p>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-black uppercase tracking-widest">No Rider</span>
                          )}
                        </td>
                        <td className="py-6">
                          <select
                            value={o.orderStatus}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              try {
                                await useOrderStore.getState().updateStatus(o._id, newStatus);
                                setOrdersList(prev => prev.map(item => item._id === o._id ? { ...item, orderStatus: newStatus } : item));
                              } catch (err) {
                                console.error('Update failed:', err);
                              }
                            }}
                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-orange-500 outline-none cursor-pointer ${STATUS_COLORS[o.orderStatus] || 'bg-slate-100 text-slate-600'}`}
                          >
                            {['placed', 'confirmed', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled'].map(s => (
                              <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-6 text-right">
                          <Link to={`/order/${o._id}`} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-600 hover:text-orange-600 hover:border-orange-200 transition-all">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── USERS ─── */}
            {activeTab === 'users' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">Platform Users</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">Manage permissions and access</p>
                  </div>
                  <button
                    onClick={() => setShowAddUser(!showAddUser)}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl active:scale-95"
                  >
                    {showAddUser ? <X size={16} /> : <Plus size={16} />}
                    {showAddUser ? 'Cancel' : 'Create New User'}
                  </button>
                </div>

                {showAddUser && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setIsSubmittingUser(true);
                      try {
                        const res = await API.post('/auth/register', newUserForm);
                        setUsersList(prev => [res.data.user, ...prev]);
                        addNotif('👤 User created successfully!', 'info');
                        setShowAddUser(false);
                        setNewUserForm({ name: '', email: '', password: '', role: 'customer' });
                      } catch (err) {
                        alert(err.response?.data?.message || 'Failed to create user');
                      } finally {
                        setIsSubmittingUser(false);
                      }
                    }}
                    className="bg-white p-10 rounded-[2.5rem] border-2 border-orange-100 shadow-2xl animate-fade-up"
                  >
                    <h4 className="font-black text-2xl mb-8 flex items-center gap-4 text-slate-900">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Users size={24} />
                      </div>
                      User Registration
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Full Name</label>
                          <input
                            required
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                            placeholder="John Doe"
                            value={newUserForm.name}
                            onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Email Address</label>
                          <input
                            required
                            type="email"
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                            placeholder="user@example.com"
                            value={newUserForm.email}
                            onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Password</label>
                          <input
                            required
                            type="password"
                            minLength={6}
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                            placeholder="••••••••"
                            value={newUserForm.password}
                            onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Account Role</label>
                          <select
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all cursor-pointer"
                            value={newUserForm.role}
                            onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}
                          >
                            <option value="customer">Customer (User)</option>
                            <option value="rider">Rider (Delivery)</option>
                            <option value="admin">Admin (Staff)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={isSubmittingUser}
                      className="w-full mt-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-50 transition-all"
                    >
                      {isSubmittingUser ? 'Creating Account...' : 'Add User to Platform'}
                    </button>
                  </form>
                )}

                <div className="overflow-x-auto bg-white rounded-[2rem] border border-slate-100">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                        <th className="pb-6 px-4">User</th>
                        <th className="pb-6">Role</th>
                        <th className="pb-6 text-center">Status</th>
                        <th className="pb-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {usersList.map((u) => (
                        <tr key={u._id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-6 px-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 uppercase">
                                {u.name?.[0]}
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-sm">{u.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-6">
                            <select
                              value={u.role}
                              onChange={async (e) => {
                                const newRole = e.target.value;
                                try {
                                  await API.put(`/admin/users/${u._id}`, { role: newRole });
                                  setUsersList(prev => prev.map(usr => usr._id === u._id ? { ...usr, role: newRole } : usr));
                                  addNotif(`🎭 Role updated to ${newRole}`, 'info');
                                } catch (err) {
                                  console.error('Failed to update role:', err);
                                  alert('Role update failed');
                                }
                              }}
                              className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-orange-500 outline-none cursor-pointer ${u.role === 'admin' ? 'bg-purple-50 text-purple-600' :
                                u.role === 'rider' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'
                                }`}
                            >
                              <option value="customer">Customer</option>
                              <option value="rider">Rider</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="py-6 text-center">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {u.isActive !== false ? 'Active' : 'Blocked'}
                            </span>
                          </td>
                          <td className="py-6 text-right">
                            <button
                              onClick={async () => {
                                try {
                                  const newStatus = u.isActive === false ? true : false;
                                  await API.put(`/admin/users/${u._id}`, { isActive: newStatus });
                                  setUsersList(prev => prev.map(usr => usr._id === u._id ? { ...usr, isActive: newStatus } : usr));
                                  addNotif(`👤 User ${newStatus ? 'enabled' : 'blocked'}`, 'info');
                                } catch (err) {
                                  console.error('Failed to update user status:', err);
                                }
                              }}
                              className={`text-[9px] font-black uppercase tracking-[0.1em] px-4 py-2 rounded-xl transition-all ${u.isActive !== false ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            >
                              {u.isActive !== false ? 'Block' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── RESTAURANTS ─── */}
            {activeTab === 'restaurants' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">Manage Kitchens</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">Add or remove restaurant partners</p>
                  </div>
                  <button
                    onClick={() => {
                      if (showAddRestaurant) {
                        setShowAddRestaurant(false);
                        setEditingId(null);
                      } else {
                        setNewRestaurantForm({ name: '', description: '', image: '', cuisines: '', address: '', city: '', ownerId: '' });
                        setShowAddRestaurant(true);
                      }
                    }}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl active:scale-95"
                  >
                    {showAddRestaurant ? <X size={16} /> : <Plus size={16} />}
                    {showAddRestaurant ? 'Cancel' : 'Add New Restaurant'}
                  </button>
                </div>

                {showAddRestaurant && (
                  <form onSubmit={handleCreateRestaurant} className="bg-white p-10 rounded-[2.5rem] border-2 border-orange-100 shadow-2xl animate-fade-up">
                    <h4 className="font-black text-2xl mb-8 flex items-center gap-4 text-slate-900">
                      <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                        <Building size={24} />
                      </div>
                      {editingId ? 'Edit Restaurant' : 'Restaurant Registration'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Display Name</label>
                          <input
                            required
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                            placeholder="e.g. Punjabi Tadka"
                            value={newRestaurantForm.name}
                            onChange={e => setNewRestaurantForm({ ...newRestaurantForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Banner Image URL</label>
                          <input
                            required
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                            placeholder="https://images.unsplash.com/..."
                            value={newRestaurantForm.image}
                            onChange={e => setNewRestaurantForm({ ...newRestaurantForm, image: e.target.value })}
                          />
                        </div>
                        {newRestaurantForm.image && (
                          <div className="animate-in fade-in zoom-in duration-300">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Banner Preview</label>
                            <div className="w-full h-32 rounded-2xl overflow-hidden border-2 border-orange-100 shadow-inner">
                              <img src={newRestaurantForm.image} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Cuisines (comma separated)</label>
                          <input
                            required
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                            placeholder="North Indian, Chinese, Mughlai"
                            value={newRestaurantForm.cuisines}
                            onChange={e => setNewRestaurantForm({ ...newRestaurantForm, cuisines: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Assign Owner (Optional)</label>
                          <select
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all cursor-pointer"
                            value={newRestaurantForm.ownerId}
                            onChange={e => setNewRestaurantForm({ ...newRestaurantForm, ownerId: e.target.value })}
                          >
                            <option value="">No Owner Assigned</option>
                            {usersList.map(u => (
                              <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Public Description</label>
                          <textarea
                            required
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all resize-none"
                            placeholder="Authentic flavors from the heart of Punjab..."
                            value={newRestaurantForm.description}
                            onChange={e => setNewRestaurantForm({ ...newRestaurantForm, description: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Street Address</label>
                            <input
                              required
                              className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                              placeholder="123 Food Street"
                              value={newRestaurantForm.address}
                              onChange={e => setNewRestaurantForm({ ...newRestaurantForm, address: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">City</label>
                            <input
                              required
                              className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                              placeholder="New Delhi"
                              value={newRestaurantForm.city}
                              onChange={e => setNewRestaurantForm({ ...newRestaurantForm, city: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={isSubmittingRest}
                      className="w-full mt-10 py-5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-orange-200 active:scale-95 disabled:opacity-50 transition-all"
                    >
                      {isSubmittingRest ? 'Saving Changes...' : (editingId ? 'Update Restaurant' : 'Register Restaurant')}
                    </button>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {restaurantsList.map((r) => (
                    <div key={r._id} className="bg-white rounded-[2.5rem] border border-slate-100 flex flex-col group hover:shadow-2xl hover:shadow-slate-200/50 transition-all overflow-hidden relative">
                      {/* Banner at top */}
                      <div className="h-40 overflow-hidden relative group">
                        <img src={r.image || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent flex items-end p-6">
                          <div>
                            <h4 className="font-black text-white text-xl leading-tight">{r.name}</h4>
                            <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.15em] mt-1">{r.cuisines?.join(', ') || 'Multi-cuisine'}</p>
                          </div>
                        </div>
                        <div className="absolute top-4 right-4 animate-in slide-in-from-right-4 duration-500">
                          <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest backdrop-blur-md border ${r.isApproved ? 'bg-emerald-500/80 text-white border-emerald-400' : 'bg-amber-500/80 text-white border-amber-400'}`}>
                            {r.isApproved ? 'Verified' : 'Reviewing'}
                          </span>
                        </div>
                      </div>

                      <div className="p-8 space-y-6">
                        <div className="flex gap-4">
                          <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest bg-orange-50 px-3 py-1.5 rounded-xl">📍 {r.location?.city || 'Local'}</p>
                          {r.owner && (
                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-xl">👤 Owner: {r.owner.name || 'Assigned'}</p>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <Link
                            to={`/admin/menu?restaurantId=${r._id}`}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all text-center flex items-center justify-center gap-2 shadow-lg active:scale-95"
                          >
                            <Edit3 size={14} /> Manage Menu
                          </Link>
                          <button
                            onClick={() => {
                              setEditingId(r._id);
                              setNewRestaurantForm({
                                name: r.name,
                                description: r.description,
                                image: r.image,
                                cuisines: r.cuisines?.join(', ') || '',
                                address: r.location?.address || '',
                                city: r.location?.city || '',
                                ownerId: r.owner?._id || r.owner || ''
                              });
                              setShowAddRestaurant(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-14 h-14 flex items-center justify-center bg-white border border-slate-100 text-slate-600 rounded-2xl hover:bg-blue-50 hover:border-blue-100 transition-all shadow-sm active:scale-95"
                            title="Edit Restaurant"
                          >
                            <Edit3 size={20} />
                          </button>
                          <button
                            onClick={() => handleDeleteRestaurant(r._id)}
                            className="w-14 h-14 flex items-center justify-center bg-white border border-slate-100 text-rose-500 rounded-2xl hover:bg-rose-50 hover:border-rose-100 transition-all shadow-sm active:scale-95"
                            title="Delete Restaurant"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>

                        {!r.isApproved && (
                          <button
                            onClick={async () => {
                              try {
                                await API.put(`/admin/restaurants/${r._id}/approve`, {});
                                setRestaurantsList(prev => prev.map(rest => rest._id === r._id ? { ...rest, isApproved: true } : rest));
                                addNotif(`✅ ${r.name} approved!`, 'info');
                              } catch (err) {
                                console.error('Approval failed:', err);
                              }
                            }}
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
                          >
                            Approve Partner
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── APPROVALS ─── */}
            {activeTab === 'approvals' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">Partner Applications</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">Review and verify new restaurant registrations</p>
                  </div>
                </div>

                {restaurantsList.filter(r => !r.isApproved).length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <CheckCircle className="text-emerald-300 mx-auto mb-4" size={40} />
                    <p className="font-black text-slate-900 text-xl mb-2">Maximum Efficiency!</p>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">No pending applications at the moment</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {restaurantsList.filter(r => !r.isApproved).map((r) => (
                      <div key={r._id} className="bg-white rounded-[2.5rem] border-2 border-amber-100 flex flex-col group hover:shadow-2xl hover:shadow-amber-100/50 transition-all overflow-hidden relative animate-fade-up">
                        <div className="h-40 overflow-hidden relative">
                          <img src={r.image || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&q=80'} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent flex items-end p-6">
                            <div>
                              <h4 className="font-black text-white text-xl leading-tight">{r.name}</h4>
                              <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.15em] mt-1">{r.cuisines?.join(', ') || 'Multi-cuisine'}</p>
                            </div>
                          </div>
                          <div className="absolute top-4 right-4">
                            <span className="text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest bg-amber-500 text-white shadow-lg border border-amber-400">
                              Pending Review
                            </span>
                          </div>
                        </div>

                        <div className="p-8 space-y-6">
                          <div className="flex flex-wrap gap-2">
                            <p className="text-[9px] text-orange-600 font-black bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">📍 {r.location?.city || 'Local'}</p>
                            {r.owner && (
                              <p className="text-[9px] text-blue-600 font-black bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">👤 {r.owner.name || 'Owner Assigned'}</p>
                            )}
                          </div>

                          <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">"{r.description || 'No description provided'}"</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">FSSAI License</p>
                                <p className="text-[10px] font-bold text-slate-700">{r.fssaiLicense || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GSTIN</p>
                                <p className="text-[10px] font-bold text-slate-700">{r.gstin || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PAN Number</p>
                                <p className="text-[10px] font-bold text-slate-700">{r.panNumber || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Address</p>
                                <p className="text-[10px] font-bold text-slate-700 italic truncate" title={r.location?.address}>{r.location?.address}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={async () => {
                                try {
                                  await API.put(`/admin/restaurants/${r._id}/approve`, {});
                                  setRestaurantsList(prev => prev.map(rest => rest._id === r._id ? { ...rest, isApproved: true } : rest));
                                  addNotif(`✨ ${r.name} is now a partner!`, 'info');
                                } catch (err) {
                                  console.error('Approval failed:', err);
                                  alert('Approval failed: ' + (err.response?.data?.message || err.message));
                                }
                              }}
                              className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 transition-all active:scale-95"
                            >
                              Verify & Approve
                            </button>
                            <button
                              onClick={() => handleDeleteRestaurant(r._id)}
                              className="w-14 h-14 flex items-center justify-center bg-rose-50 text-rose-500 border border-rose-100 rounded-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                              title="Reject Application"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── FINANCE ─── */}
            {activeTab === 'finance' && (
              <div className="space-y-8 animate-fade-up">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">Financial Reports</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">Revenue breakdown and partner settlements</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Revenue</p>
                      <p className="text-xl font-black text-slate-900">₹{financeData.totalGrossRevenue?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Admin Earnings</p>
                      <p className="text-xl font-black text-emerald-600">₹{financeData.totalCommission?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Earnings Chart */}
                <div className="p-10 bg-slate-900 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-20">
                    <TrendingUp size={120} />
                  </div>
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-orange-400 mb-10">Revenue Velocity</h4>
                  <div className="h-48 flex items-end gap-4">
                    {financeData.weeklyReport?.map((val, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-4">
                        <div
                          style={{ height: `${(val / (Math.max(...financeData.weeklyReport) || 1)) * 100}%` }}
                          className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-2xl min-h-[4px] relative group hover:scale-105 transition-all cursor-pointer"
                        >
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-3 py-1 rounded-lg text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">₹{val}</div>
                        </div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Settlement Table */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Partner Settlements</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans">
                      <thead>
                        <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                          <th className="py-6 px-10">Restaurant</th>
                          <th className="py-6">Gross Sales</th>
                          <th className="py-6">Commission</th>
                          <th className="py-6">Net Payout</th>
                          <th className="py-6 px-10 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {financeData.settlements?.map((s, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-6 px-10">
                              <p className="font-black text-slate-900 text-sm">{s.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.totalOrders} Orders</p>
                            </td>
                            <td className="py-6 font-black text-slate-900">₹{s.gross.toLocaleString()}</td>
                            <td className="py-6 font-black text-rose-500">-₹{s.commission.toLocaleString()}</td>
                            <td className="py-6 font-black text-emerald-600">₹{s.net.toLocaleString()}</td>
                            <td className="py-6 px-10 text-right">
                              <button className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition-all">
                                Process Payout
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ─── SUPPORT TICKETS ─── */}
            {activeTab === 'support' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-xl text-slate-900">Help Desk Management</h3>
                  <div className="flex gap-2">
                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {supportTickets.filter(t => t.status === 'open').length} Open
                    </span>
                  </div>
                </div>

                {supportTickets.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <AlertCircle className="text-slate-300 mx-auto mb-4" size={40} />
                    <p className="font-black text-slate-900 text-xl mb-2">No support tickets</p>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Customer and rider problems will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {supportTickets.map(ticket => (
                      <div key={ticket._id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black uppercase text-[10px] ${ticket.role === 'rider' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'
                              }`}>
                              {ticket.role}
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <h5 className="font-black text-lg text-slate-900">{ticket.subject}</h5>
                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${ticket.priority === 'urgent' ? 'bg-rose-100 text-rose-600 animate-pulse' :
                                  ticket.priority === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                  {ticket.priority}
                                </span>
                              </div>
                              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                                {ticket.user?.name} ({ticket.user?.phone || 'No phone'}) • {new Date(ticket.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex-1 px-6">
                            <p className="text-slate-500 text-sm font-medium">"{ticket.message}"</p>
                            {ticket.order && (
                              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2">Order: #{ticket.order.orderId || 'N/A'}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <select
                              value={ticket.status}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                try {
                                  await API.put(`/support/${ticket._id}/status`, { status: newStatus });
                                  setSupportTickets(prev => prev.map(t => t._id === ticket._id ? { ...t, status: newStatus } : t));
                                } catch (err) {
                                  alert('Failed to update ticket status');
                                }
                              }}
                              className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl outline-none cursor-pointer border-none shadow-sm ${ticket.status === 'open' ? 'bg-amber-50 text-amber-600' :
                                ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                }`}
                            >
                              <option value="open">Open</option>
                              <option value="pending">Pending</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
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
