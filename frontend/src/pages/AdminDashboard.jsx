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
    <div className="min-h-screen bg-[#F4F7FE] flex flex-col pt-10">
      <div className="max-w-7xl mx-auto w-full px-6 py-12 grow">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Overview</h1>
          <p className="text-slate-500 font-medium">Welcome back, Admin. Here is what's happening across FoodCourt.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
              <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6`}>
                <stat.icon size={28} />
              </div>
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b overflow-x-auto scrollbar-hide">
            {['overview', 'users', 'restaurants', 'orders'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-10 py-6 font-black text-sm uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'text-orange-500 border-b-4 border-orange-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-8 md:p-12">
            {activeTab === 'overview' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="p-8 bg-slate-900 rounded-[2rem] text-white">
                  <h4 className="font-bold text-xl mb-4">Traffic Insights</h4>
                  <div className="h-32 flex items-end gap-2">
                    {[40, 70, 45, 90, 65, 80, 30].map((h, i) => (
                      <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-orange-500 rounded-t-lg opacity-80" />
                    ))}
                  </div>
                  <p className="mt-4 text-slate-400 text-sm">System load is normal. User activity peak at 8 PM.</p>
                </div>
                <div className="p-8 border-2 border-slate-50 rounded-[2rem]">
                  <h4 className="font-bold text-xl mb-4 text-slate-900">Platform Health</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm font-medium p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                      All systems operational.
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium p-4 bg-blue-50 text-blue-600 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-blue-600" />
                      Payment gateway (Stripe) is active.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-100">
                      <th className="pb-4 pl-4">Name</th>
                      <th className="pb-4">Email</th>
                      <th className="pb-4">Role</th>
                      <th className="pb-4">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {usersList.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 pl-4 font-bold text-slate-900">{u.name}</td>
                        <td className="py-4 text-slate-500 text-sm">{u.email}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                            u.role === 'rider' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 text-slate-400 text-xs font-medium">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'restaurants' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {restaurantsList.length > 0 ? restaurantsList.map((r) => (
                  <div key={r._id} className="p-6 bg-slate-50 rounded-2xl flex justify-between items-center">
                    <div>
                      <h4 className="font-black text-slate-900">{r.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">Approved: {r.isApproved ? '✅' : '⏳'}</p>
                    </div>
                    <span className={`text-xs font-black px-3 py-1 rounded-full ${r.isApproved ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {r.isApproved ? 'Active' : 'Pending'}
                    </span>
                  </div>
                )) : (
                  <p className="text-slate-400 font-medium col-span-2 text-center py-10">No restaurants registered yet.</p>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-100">
                      <th className="pb-4 pl-4">Order ID</th>
                      <th className="pb-4">Customer</th>
                      <th className="pb-4">Status</th>
                      <th className="pb-4">Total</th>
                      <th className="pb-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ordersList.map((o) => (
                      <tr key={o._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 pl-4 font-bold text-slate-900 text-sm">#{(o.orderId || o._id).slice(-8)}</td>
                        <td className="py-4 font-bold text-slate-500 text-xs">{o.customer?.firstName || o.customer?.name || 'Guest'}</td>
                        <td className="py-4">
                          <select
                            value={o.orderStatus}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              try {
                                await useOrderStore.getState().updateStatus(o._id, newStatus);
                                setOrdersList(prev => prev.map(item => item._id === o._id ? { ...item, orderStatus: newStatus } : item));
                              } catch (err) {
                                console.error('Failed to update status:', err);
                              }
                            }}
                            className="text-[10px] font-black uppercase bg-slate-100 px-2 py-1 rounded-md outline-none border-none cursor-pointer focus:ring-1 focus:ring-orange-500"
                          >
                            {['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-4 font-black text-slate-900 text-sm">₹{o.total?.toFixed(0)}</td>
                        <td className="py-4">
                          <Link to={`/order/${o._id}`} className="text-orange-500 font-bold text-[10px] uppercase tracking-widest hover:underline">Details</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>
                {ordersList.length === 0 && <p className="text-slate-400 font-medium text-center py-10">No orders placed yet.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
