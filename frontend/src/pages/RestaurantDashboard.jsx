import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, TrendingUp, Users, Clock, CheckCircle, Store, AlertCircle, Package } from 'lucide-react';
import API from '../api/axios';
import Loader from '../components/Loader';
import { useAuthStore } from '../context/authStore';
import { useOrderStore } from '../store/orderStore';

export default function RestaurantDashboard() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (user?.role === 'restaurant') {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await API.get('/orders/history'); // Backend now filters by restaurant
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch restaurant orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await useOrderStore.getState().updateStatus(orderId, newStatus);
      fetchOrders(); // Refresh
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  if (!user || user.role !== 'restaurant') {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-slate-100 max-w-sm">
          <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
          <h2 className="text-xl font-black text-slate-900 mb-2">Restricted Access</h2>
          <p className="text-slate-500 font-bold text-sm mb-6 uppercase tracking-widest">Restaurant account required</p>
          <Link to="/signin" className="inline-block px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest">Sign In</Link>
        </div>
      </div>
    );
  }

  if (loading && orders.length === 0) return <Loader />;

  const pendingOrders = orders.filter(o => ['placed', 'confirmed'].includes(o.orderStatus));
  const activeOrders = orders.filter(o => ['preparing', 'ready'].includes(o.orderStatus));
  const completedOrders = orders.filter(o => ['picked_up', 'delivered'].includes(o.orderStatus));

  const stats = [
    { label: 'New Orders', value: pendingOrders.length, icon: ShoppingBag, color: 'orange' },
    { label: 'Active Kitchen', value: activeOrders.length, icon: Flame, color: 'rose' },
    { label: 'Completed', value: completedOrders.length, icon: CheckCircle, color: 'emerald' },
  ];

  // Helper component for Icons that might be missing
  function Flame({ size }) { return <Package size={size} />; } // Fallback if icon missing

  return (
    <div className="min-h-screen bg-[#F8F9FB] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Kitchen <span className="text-orange-600">Command</span></h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Management Console for {user?.name || 'Your Establishment'}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center animate-pulse">
              <div className="w-2 h-2 bg-emerald-600 rounded-full" />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
              <p className="font-black text-slate-900">OPEN & ACTIVE</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
                  <p className={`text-5xl font-black text-slate-900 tracking-tighter`}>{stat.value}</p>
                </div>
                <div className={`w-14 h-14 bg-${stat.color}-50 text-${stat.color}-500 rounded-2xl flex items-center justify-center`}>
                  <stat.icon size={28} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-50">
            {['pending', 'kitchen', 'history'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-6 font-black text-[10px] uppercase tracking-[0.2em] transition-all ${activeTab === tab ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/10' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                {tab === 'kitchen' ? 'In Preparation' : tab}
              </button>
            ))}
          </div>

          <div className="p-8 md:p-12">
            <div className="space-y-6">
              {(activeTab === 'pending' ? pendingOrders : activeTab === 'kitchen' ? activeOrders : completedOrders).map((order) => (
                <div key={order._id} className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white rounded-2xl border border-slate-100 flex items-center justify-center shadow-sm">
                        <Package className="text-orange-500" size={32} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-black text-slate-900 text-xl">Order #{order.orderId || order._id.slice(-6)}</span>
                          <span className="px-3 py-1 bg-slate-100 text-[9px] font-black uppercase tracking-widest rounded-lg">{order.orderStatus}</span>
                        </div>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
                          {order.items.length} Items • ₹{order.total} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                      <Link to={`/order/${order._id}`} className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:border-slate-400 transition-all">
                        Order Details
                      </Link>

                      {order.orderStatus === 'placed' && (
                        <div className="flex gap-2 flex-1 lg:flex-none">
                          <button
                            onClick={() => handleStatusUpdate(order._id, 'confirmed')}
                            className="flex-1 px-8 py-3 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-orange-700 shadow-lg shadow-orange-100"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(order._id, 'cancelled')}
                            className="px-6 py-3 bg-white border border-rose-200 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {order.orderStatus === 'confirmed' && (
                        <button
                          onClick={() => handleStatusUpdate(order._id, 'preparing')}
                          className="flex-1 lg:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-blue-700 shadow-lg shadow-blue-100"
                        >
                          Start Cooking
                        </button>
                      )}

                      {order.orderStatus === 'preparing' && (
                        <button
                          onClick={() => handleStatusUpdate(order._id, 'ready')}
                          className="flex-1 lg:flex-none px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-emerald-700 shadow-lg shadow-emerald-100"
                        >
                          Mark Ready
                        </button>
                      )}

                      {order.orderStatus === 'ready' && (
                        <div className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-200">
                          Waiting for Rider
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Items List */}
                  <div className="mt-8 pt-6 border-t border-slate-100/50">
                    <div className="flex flex-wrap gap-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <span className="font-black text-orange-600 text-xs">{item.quantity}x</span>
                          <span className="font-bold text-slate-600 text-xs">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {(activeTab === 'pending' ? pendingOrders : activeTab === 'kitchen' ? activeOrders : completedOrders).length === 0 && (
                <div className="text-center py-20">
                  <p className="text-slate-400 font-bold italic">No {activeTab} orders at the moment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
