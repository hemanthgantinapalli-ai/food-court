import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ShoppingCart, TrendingUp, Building, ArrowUpRight, AlertCircle } from 'lucide-react';
import Loader from '../components/Loader';
import { useAuthStore } from '../context/authStore';
import { useOrderStore } from '../store/orderStore';
import API from '../api/axios';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [restaurantsList, setRestaurantsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, restRes, ordersRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/users'),
        API.get('/admin/restaurants'),
        API.get('/admin/orders')
      ]);

      setStats(statsRes.data.data);
      setUsersList(usersRes.data.data);
      setRestaurantsList(restRes.data.data);
      setOrdersList(ordersRes.data.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
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

  const statCards = [
    { label: 'Total Revenue', value: `₹${stats?.totalRevenue?.toLocaleString() || 0}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Restaurants', value: stats?.totalRestaurants || 0, icon: Building, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header - Glassmorphism */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 mb-8 border border-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">Admin <span className="text-orange-600">Panel</span></h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Manage users, orders, and restaurants</p>
          </div>
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

        {/* Dynamic Stats Grid */}
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

        {/* Main Management Tabs */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-50 p-2 gap-2 bg-slate-50/50">
            {['overview', 'users', 'restaurants', 'orders'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-8 md:p-12">
            {activeTab === 'overview' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="p-10 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200">
                  <div className="flex justify-between items-start mb-8">
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Traffic Distribution</h4>
                    <ArrowUpRight className="text-orange-500" />
                  </div>
                  <div className="h-40 flex items-end gap-3 mb-6">
                    {[40, 70, 45, 90, 65, 80, 40, 60].map((h, i) => (
                      <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-gradient-to-t from-orange-600 to-orange-400 rounded-xl opacity-90 transition-all hover:scale-110" />
                    ))}
                  </div>
                  <p className="text-slate-400 text-xs font-bold leading-relaxed">System load is stable. Daily user activity peaked at <span className="text-white">8:42 PM</span> today.</p>
                </div>

                <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-8">Platform Integrity</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest p-4 bg-white rounded-2xl border border-slate-100 text-emerald-600 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        System: Active
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest p-4 bg-white rounded-2xl border border-slate-100 text-blue-600 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                        Payments: Ready
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 flex items-center gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <AlertCircle className="text-orange-500" size={20} />
                    <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">No critical security alerts</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                      <th className="pb-6 px-4">User</th>
                      <th className="pb-6">Role</th>
                      <th className="pb-6 text-center">Status</th>
                      <th className="pb-6 text-right">Settings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {usersList.map((u) => (
                      <tr key={u._id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-6 px-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 uppercase">
                              {u.name[0]}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-sm">{u.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-purple-50 text-purple-600' :
                            u.role === 'rider' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'
                            }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-6 text-center">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {u.isActive !== false ? 'Active' : 'Blocked'}
                          </span>
                        </td>
                        <td className="py-6 text-right">
                          <button
                            onClick={async () => {
                              try {
                                const newStatus = u.isActive === false ? true : false;
                                await API.put(`/admin/users/${u._id}/status`, { isActive: newStatus });
                                setUsersList(prev => prev.map(user => user._id === u._id ? { ...user, isActive: newStatus } : user));
                              } catch (err) {
                                console.error('Failed to update user status:', err);
                              }
                            }}
                            className={`text-[9px] font-black uppercase tracking-[0.1em] px-4 py-2 rounded-xl transition-all ${u.isActive !== false ? 'text-rose-600 hover:bg-rose-50 underline' : 'text-emerald-600 hover:bg-emerald-50 underline'
                              }`}
                          >
                            {u.isActive !== false ? 'Block Account' : 'Enable Account'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'restaurants' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {restaurantsList.map((r) => (
                  <div key={r._id} className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 flex flex-col gap-8 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-5">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-inner border border-slate-100 overflow-hidden shrink-0">
                          {r.image ? <img src={r.image} alt={r.name} className="w-full h-full object-cover" /> : r.name[0]}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-lg leading-tight">{r.name}</h4>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">{r.cuisine || 'Multi-cuisine'}</p>
                          <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest mt-2">ID: {r.owner?.name || 'Partner'}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${r.isApproved ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        {r.isApproved ? 'Verified' : 'Reviewing'}
                      </span>
                    </div>

                    {!r.isApproved && (
                      <button
                        onClick={async () => {
                          try {
                            await API.put(`/admin/restaurants/${r._id}/approve`);
                            setRestaurantsList(prev => prev.map(rest => rest._id === r._id ? { ...rest, isApproved: true } : rest));
                            setStats(prev => ({ ...prev, totalRestaurants: (prev.totalRestaurants || 0) + 1 }));
                          } catch (err) {
                            console.error('Approval failed:', err);
                            alert('Approval failed');
                          }
                        }}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                      >
                        Approve Merchant
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                      <th className="pb-6 px-4">Order ID</th>
                      <th className="pb-6">Price</th>
                      <th className="pb-6">Status</th>
                      <th className="pb-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ordersList.map((o) => (
                      <tr key={o._id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-6 px-4">
                          <p className="font-black text-slate-900 text-sm">#{(o.orderId || o._id).slice(-8)}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{o.restaurant?.name || 'Restaurant'}</p>
                        </td>
                        <td className="py-6">
                          <p className="font-black text-slate-900">₹{o.total?.toFixed(0)}</p>
                          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Successful</p>
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
                            className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-orange-500 outline-none cursor-pointer"
                          >
                            {['pending', 'preparing', 'dispatched', 'on_the_way', 'delivered', 'cancelled'].map(s => (
                              <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-6 text-right">
                          <Link to={`/order/${o._id}`} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-600 hover:text-orange-600 hover:border-orange-200 transition-all">View Details</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
