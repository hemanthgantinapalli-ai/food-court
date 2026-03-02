import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, MapPin, TrendingUp, AlertCircle, Clock, Package, User as UserIcon, CheckCircle, Truck } from 'lucide-react';
import Loader from '../components/Loader';
import { useAuthStore } from '../context/authStore';
import { useOrderStore } from '../store/orderStore';
import API from '../api/axios';
import { socket, connectSocket, disconnectSocket } from '../api/socket.js';

export default function RiderDashboard() {
  const { user } = useAuthStore();
  const [assignedOrders, setAssignedOrders] = React.useState([]);
  const [availableOrders, setAvailableOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('available');
  const [isOnline, setIsOnline] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  React.useEffect(() => {
    if (user?.role === 'rider') {
      fetchData();
    }
  }, [user]);

  React.useEffect(() => {
    if (!user || user.role !== 'rider') return;

    if (isOnline) {
      connectSocket(user._id);

      // Join the riders room to receive broadcasts
      socket.emit('join_role', 'riders');

      // New order placed by a customer — add to marketplace
      socket.on('new_order_available', (data) => {
        console.log('📬 New order available:', data);
        setAvailableOrders(prev => {
          if (prev.find(o => o._id === data._id)) return prev;
          return [data, ...prev];
        });
        showToast(`🛵 New order from ${data.restaurantName || 'a restaurant'}!`);
      });

      // Another rider claimed this order — remove from our list
      socket.on('order_taken', ({ orderId }) => {
        console.log('🚫 Order taken by another rider:', orderId);
        setAvailableOrders(prev => prev.filter(o => o._id !== orderId));
      });

      // Order status updated by admin/restaurant
      socket.on('order_status_update', (data) => {
        setAssignedOrders(prev =>
          prev.map(o => o._id === data.orderId ? { ...o, orderStatus: data.status } : o)
        );
      });

      fetchData();
    } else {
      disconnectSocket();
      setAvailableOrders([]);
    }

    return () => {
      socket.off('new_order_available');
      socket.off('order_taken');
      socket.off('order_status_update');
    };
  }, [isOnline, user]);

  // Live location tracking
  React.useEffect(() => {
    let interval;
    if (isOnline && user?.role === 'rider') {
      interval = setInterval(() => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              await API.post('/riders/update-location', { latitude, longitude });
            } catch (err) {
              console.error('Failed to update live location:', err);
            }
          });
        }
      }, 30000);
    }
    return () => interval && clearInterval(interval);
  }, [isOnline, user]);

  const handleToggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      await API.put('/riders/toggle-online', { isOnline: newStatus });
      setIsOnline(newStatus);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const assignedRes = await API.get('/orders/history?type=delivery');
      setAssignedOrders(assignedRes.data.data || []);

      if (isOnline) {
        const availableRes = await API.get('/orders/history?type=available');
        setAvailableOrders(availableRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      // ✅ Correct endpoint
      await API.post(`/orders/${orderId}/accept`);
      showToast('✅ Order accepted! Head to the restaurant.');
      fetchData();
      setActiveTab('active');
    } catch (error) {
      console.error('Failed to accept order:', error);
      alert(error?.response?.data?.message || 'Could not accept order. It may have been taken.');
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await useOrderStore.getState().updateStatus(orderId, newStatus);
      showToast(newStatus === 'delivered' ? '🎉 Order delivered!' : '✅ Status updated!');
      fetchData();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update order status');
    }
  };

  if (!user || user.role !== 'rider') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] pt-20">
        <div className="text-center bg-white p-12 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-md w-full mx-4">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Rider Access Only</h1>
          <p className="text-slate-500 font-bold leading-relaxed mb-8">Please sign in with a Rider account to access the delivery console.</p>
          <Link to="/signin" className="inline-block bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-100">
            Switch Account
          </Link>
        </div>
      </div>
    );
  }

  if (loading && assignedOrders.length === 0) return <Loader />;

  const completedDeliveries = assignedOrders.filter((o) => ['delivered', 'cancelled'].includes(o.orderStatus));
  const activeDeliveries = assignedOrders.filter((o) => ['confirmed', 'preparing', 'ready', 'on_the_way'].includes(o.orderStatus));
  const totalEarnings = completedDeliveries.reduce((sum, order) => sum + (order.orderStatus === 'delivered' ? (order.deliveryFee || 0) : 0), 0);

  const statusBadge = (status) => {
    const map = {
      placed: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-orange-100 text-orange-700',
      ready: 'bg-emerald-100 text-emerald-700',
      on_the_way: 'bg-indigo-100 text-indigo-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] pt-24 pb-12">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl font-black text-sm animate-bounce">
          {toastMsg}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 mb-8 border border-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">Rider <span className="text-orange-600">Portal</span></h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Track your earnings and manage your deliveries</p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
            <button
              id="rider-online-toggle"
              onClick={handleToggleOnline}
              className={`group relative overflow-hidden px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all duration-500 shadow-xl active:scale-95 ${isOnline
                ? 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600'
                : 'bg-slate-900 text-white shadow-slate-200 hover:bg-orange-600 ring-4 ring-orange-500/20'
                }`}
            >
              <div className="relative z-10 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-rose-500'}`} />
                {isOnline ? 'Go Offline' : 'Go Online & Accept Orders'}
              </div>
            </button>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
              {isOnline ? 'You are live — orders appear in real-time' : 'Go online to start receiving orders'}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Today Orders', value: assignedOrders.length, icon: ShoppingCart, color: 'orange' },
            { label: 'Earnings', value: `₹${totalEarnings}`, icon: TrendingUp, color: 'emerald' },
            { label: 'Active Tasks', value: activeDeliveries.length, icon: MapPin, color: 'blue' }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-[2rem] p-8 border border-white shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2">{stat.label}</p>
                  <p className={`text-4xl font-black text-slate-900 tracking-tighter group-hover:text-${stat.color}-600 transition-colors`}>{stat.value}</p>
                </div>
                <div className={`w-14 h-14 bg-${stat.color}-50 text-${stat.color}-500 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <stat.icon size={28} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Panel */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-50 p-2 gap-2 bg-slate-50/50">
            {[
              { id: 'available', label: 'New Orders', count: availableOrders.length },
              { id: 'active', label: 'Active Deliveries', count: activeDeliveries.length },
              { id: 'completed', label: 'Completed', count: completedDeliveries.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab.id
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                  }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activeTab === tab.id ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-8 md:p-12">
            <div className="space-y-4">

              {/* ────── AVAILABLE ORDERS ────── */}
              {activeTab === 'available' && (
                !isOnline ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <AlertCircle size={36} />
                    </div>
                    <p className="text-slate-900 font-black text-xl mb-2">You are currently offline</p>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Go online to receive new order requests in real-time</p>
                  </div>
                ) : availableOrders.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <ShoppingCart className="text-slate-300" size={32} />
                    </div>
                    <p className="text-slate-900 font-black text-xl mb-2">No orders available right now...</p>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-8">New orders will appear here automatically</p>
                    <button
                      onClick={fetchData}
                      className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm"
                    >
                      Refresh
                    </button>
                  </div>
                ) : (
                  availableOrders.map((order) => (
                    <div key={order._id} className="group p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner shrink-0">
                          🍔
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-black text-slate-900 text-lg">Order #{(order.orderId || order._id)?.slice(-6)}</p>
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${statusBadge(order.orderStatus)}`}>
                              {order.orderStatus?.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                            {order.restaurant?.name || order.restaurantName} • <span className="text-emerald-600">₹{order.deliveryFee} fee</span>
                          </p>
                          <div className="mt-3 space-y-2">
                            <div className="flex items-start gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                              <Package size={12} className="text-orange-400 shrink-0 mt-0.5" />
                              <span>Pickup: {order.restaurant?.location?.address || order.restaurantAddress || 'Restaurant'}</span>
                            </div>
                            <div className="flex items-start gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                              <MapPin size={12} className="text-blue-500 shrink-0 mt-0.5" />
                              <span>Drop: {order.deliveryAddress?.street || order.deliveryAddress?.area || 'Customer Address'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 w-full md:w-auto">
                        <button
                          id={`accept-order-${order._id}`}
                          onClick={() => handleAcceptOrder(order._id)}
                          className="flex-1 md:flex-none px-8 py-4 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 active:scale-95"
                        >
                          ✅ Accept Order
                        </button>
                        <Link to={`/order/${order._id}`} className="flex-1 md:flex-none px-6 py-4 bg-white border border-slate-200 rounded-xl text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all text-center">
                          View
                        </Link>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* ────── ACTIVE DELIVERIES ────── */}
              {activeTab === 'active' && (
                activeDeliveries.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 font-bold">No active deliveries right now.</div>
                ) : (
                  activeDeliveries.map((order) => (
                    <div key={order._id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg ${order.orderStatus === 'on_the_way' ? 'bg-indigo-500 animate-pulse' : 'bg-orange-500'}`}>
                            {order.orderStatus === 'on_the_way' ? <Truck size={24} /> : <Package size={24} />}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 leading-tight">Order #{(order.orderId || order._id)?.slice(-6)}</p>
                            <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest mt-1 flex items-center gap-1">
                              <UserIcon size={10} className="text-slate-300" /> {order.customer?.name || 'Customer'}
                            </p>
                            <span className={`mt-2 inline-block px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${statusBadge(order.orderStatus)}`}>
                              {order.orderStatus?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 px-4 space-y-1.5 hidden lg:block">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Package size={12} /> From: {order.restaurant?.location?.address || 'Pickup'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                            <MapPin size={12} className="text-blue-500" /> To: {order.deliveryAddress?.street || 'Destination'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap justify-end">
                          {/* Status progression buttons */}
                          {order.orderStatus === 'confirmed' && (
                            <button
                              onClick={() => handleStatusUpdate(order._id, 'on_the_way')}
                              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                            >
                              🛵 Start Delivery
                            </button>
                          )}
                          {order.orderStatus === 'preparing' && (
                            <button
                              onClick={() => handleStatusUpdate(order._id, 'on_the_way')}
                              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                            >
                              🛵 Picked Up
                            </button>
                          )}
                          {order.orderStatus === 'on_the_way' && (
                            <button
                              onClick={() => handleStatusUpdate(order._id, 'delivered')}
                              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 animate-pulse"
                            >
                              ✅ Mark Delivered
                            </button>
                          )}
                          <Link to={`/order/${order._id}`} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all">
                            Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* ────── COMPLETED ────── */}
              {activeTab === 'completed' && (
                completedDeliveries.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <Clock className="text-slate-300" size={32} />
                    </div>
                    <p className="text-slate-900 font-black text-xl mb-2">No completed tasks yet</p>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Your successfully delivered orders will appear here</p>
                  </div>
                ) : (
                  completedDeliveries.map((order) => (
                    <div key={order._id} className="group p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner shrink-0 ${order.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                          {order.orderStatus === 'delivered' ? <CheckCircle size={28} /> : '×'}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-lg">Order #{(order.orderId || order._id)?.slice(-6)}</p>
                          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mt-1">
                            {order.restaurant?.name} • <span className="text-slate-400">{new Date(order.updatedAt).toLocaleDateString()} at {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-right">
                          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">Fee Earned</p>
                          <p className={`text-xl font-black ${order.orderStatus === 'delivered' ? 'text-emerald-600' : 'text-slate-400 line-through'}`}>₹{order.deliveryFee}</p>
                        </div>
                        <Link to={`/order/${order._id}`} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>

        {/* Recent Successes Footer */}
        {completedDeliveries.length > 0 && (
          <div className="mt-12 bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200 text-white">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black tracking-tight">Recent Deliveries</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Keep up the great work 🎉</p>
              </div>
              <TrendingUp className="text-emerald-500" size={24} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {completedDeliveries.slice(0, 3).map((order) => (
                <div key={order._id} className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center font-black">✓</div>
                  <div>
                    <p className="font-black text-sm text-white">#{(order.orderId || order._id)?.slice(-6)}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[120px]">{order.restaurant?.name}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm font-black text-emerald-400">₹{order.deliveryFee}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
