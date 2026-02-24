import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, MapPin, TrendingUp, AlertCircle } from 'lucide-react';
import Loader from '../components/Loader';
import { useAuthStore } from '../context/authStore';
import API from '../api/axios';

export default function RiderDashboard() {
  const { user } = useAuthStore();
  const [assignedOrders, setAssignedOrders] = React.useState([]);
  const [availableOrders, setAvailableOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('available');
  const [isOnline, setIsOnline] = React.useState(false);

  React.useEffect(() => {
    if (user?.role === 'rider') {
      fetchData();
    }
  }, [user, isOnline]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch orders already assigned to this rider
      const assignedRes = await API.get('/orders/history?type=delivery');
      setAssignedOrders(assignedRes.data.data);

      // 2. If online, fetch available orders
      if (isOnline) {
        const availableRes = await API.get('/orders/history?type=available');
        setAvailableOrders(availableRes.data.data);
      } else {
        setAvailableOrders([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      await API.post(`/orders/${orderId}/accept`);
      // Refresh data
      fetchData();
      setActiveTab('active');
    } catch (error) {
      console.error('Failed to accept order:', error);
      alert('Could not accept order. It may have been taken by another rider.');
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

  const completedDeliveries = assignedOrders.filter((o) => o.orderStatus === 'delivered');
  const activeDeliveries = assignedOrders.filter((o) => ['confirmed', 'preparing', 'ready', 'picked_up'].includes(o.orderStatus));
  const totalEarnings = completedDeliveries.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8F9FB] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header with Glassmorphism */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 mb-8 border border-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">Delivery <span className="text-orange-600">Center</span></h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {isOnline ? 'Active' : 'Standby'}
              </span>
            </div>
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Manage your tasks and track your daily performance</p>
          </div>

          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`group relative overflow-hidden px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all duration-500 shadow-lg active:scale-95 ${isOnline ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-900 text-white shadow-slate-200'
              }`}
          >
            <div className="relative z-10 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full animate-ping ${isOnline ? 'bg-white' : 'bg-rose-500'}`} />
              {isOnline ? 'Go Offline' : 'Go Online'}
            </div>
          </button>
        </div>

        {/* Dynamic Stats Grid */}
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

        {/* Task Management Tabs */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-50 p-2 gap-2 bg-slate-50/50">
            {[
              { id: 'available', label: 'Marketplace', count: availableOrders.length },
              { id: 'active', label: 'My Queue', count: activeDeliveries.length },
              { id: 'completed', label: 'History', count: completedDeliveries.length }
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
                <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activeTab === tab.id ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="p-8 md:p-12">
            <div className="space-y-4">
              {activeTab === 'available' && (
                !isOnline ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <AlertCircle size={32} />
                    </div>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">You are currently offline</p>
                    <p className="text-slate-900 font-black text-lg mt-2">Go online to start seeing available deliveries</p>
                  </div>
                ) : availableOrders.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-slate-400 font-bold italic">No orders in your area right now...</p>
                  </div>
                ) : (
                  availableOrders.map((order) => (
                    <div key={order._id} className="group p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-6 w-full md:w-auto">
                        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner shrink-0">
                          FC
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-lg">Order #{order.orderId || order._id.slice(-6)}</p>
                          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mt-1">
                            {order.restaurant?.name} • <span className="text-emerald-600">₹{order.deliveryFee} tip</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 w-full md:w-auto">
                        <Link to={`/order/${order._id}`} className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all text-center">
                          View Path
                        </Link>
                        <button
                          onClick={() => handleAcceptOrder(order._id)}
                          className="flex-1 md:flex-none px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 active:scale-95"
                        >
                          Accept Task
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}

              {activeTab === 'active' && (
                activeDeliveries.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">Your queue is empty.</div>
                ) : (
                  activeDeliveries.map((order) => (
                    <div key={order._id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black uppercase text-[10px] ${order.orderStatus === 'ready' ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'
                            }`}>
                            {order.orderStatus[0]}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">Order #{order.orderId || order._id.slice(-6)}</p>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">{order.restaurant?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Current Status</p>
                            <p className="font-black text-orange-600 uppercase text-xs mt-1">{order.orderStatus.replace('_', ' ')}</p>
                          </div>
                          <Link to={`/order/${order._id}`} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all">
                            Manage Task
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}

              {activeTab === 'completed' && (
                completedDeliveries.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">No completed tasks yet.</div>
                ) : (
                  completedDeliveries.map((order) => (
                    <div key={order._id} className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-50 transition-all flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                          <AlertCircle size={20} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">Order #{order.orderId || order._id.slice(-6)}</p>
                          <p className="text-slate-400 font-bold text-[10px]">{new Date(order.updatedAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <p className="font-black text-slate-900">₹{order.deliveryFee}</p>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

