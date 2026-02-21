import React from 'react';
import { Users, ShoppingCart, TrendingUp, Building, ArrowUpRight } from 'lucide-react';
import Loader from '../components/Loader';
import { useAuthStore } from '../context/authStore';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState('overview');

  const stats = [
    { label: 'Total Revenue', value: '₹45,290', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Users', value: '1,204', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Orders Today', value: '156', icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Restaurants', value: '48', icon: Building, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-6 py-12 grow">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Overview</h1>
          <p className="text-slate-500 font-medium">Welcome back, Admin. Here is what's happening today.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
              <div className={`${stat.bg} ${stat.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6`}>
                <stat.icon size={28} />
              </div>
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
              <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-4">
                <ArrowUpRight size={14} /> +12.5% vs last month
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b">
            {['overview', 'users', 'restaurants', 'orders'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-10 py-6 font-black text-sm uppercase tracking-widest transition-all ${activeTab === tab ? 'text-orange-500 border-b-4 border-orange-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="p-12">
            {activeTab === 'overview' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="p-8 bg-slate-900 rounded-[2rem] text-white">
                  <h4 className="font-bold text-xl mb-4">Real-time Traffic</h4>
                  <div className="h-32 flex items-end gap-2">
                    {[40, 70, 45, 90, 65, 80, 30].map((h, i) => (
                      <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-orange-500 rounded-t-lg opacity-80" />
                    ))}
                  </div>
                </div>
                <div className="p-8 border-2 border-slate-50 rounded-[2rem]">
                  <h4 className="font-bold text-xl mb-4 text-slate-900">Recent Alerts</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm font-medium p-4 bg-red-50 text-red-600 rounded-xl">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                      Restaurant "Pizza Hut" reported a delay.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}