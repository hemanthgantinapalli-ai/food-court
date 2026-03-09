import React, { useEffect, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';
import API from '../api/axios';
import { TrendingUp, Users, ShoppingBag, Clock, IndianRupee } from 'lucide-react';

const COLORS = ['#FF6B35', '#F7931E', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

export default function AdminBI() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await API.get('/analytics/admin/overview');
            setData(res.data.data);
        } catch (err) {
            console.error('Failed to fetch BI data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-96 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Computing Intelligence...</div>;
    if (!data) return <div className="p-10 text-center text-slate-400">Unable to load analytics data.</div>;

    // Formatting data for charts
    const revenueTrendData = data.revenueTrends.map(item => ({
        name: item._id,
        revenue: item.revenue,
        orders: item.orders
    }));

    const peakHourData = Array.from({ length: 24 }, (_, i) => {
        const found = data.peakHours.find(h => h._id === i);
        return {
            hour: `${i}:00`,
            orders: found ? found.count : 0
        };
    });

    const cuisineData = data.restaurantCuisines.map(item => ({
        name: item._id,
        value: item.count
    }));

    const paymentData = data.paymentDistribution.map(item => ({
        name: item._id.toUpperCase(),
        value: item.count
    }));

    return (
        <div className="space-y-10 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Revenue & Growth Trend */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="font-black text-slate-900 text-lg tracking-tight">Revenue Trends</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Gross sales over the last 30 days</p>
                        </div>
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueTrendData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 900 }}
                                    labelStyle={{ fontSize: '10px', fontWeight: 900, marginBottom: '4px', color: '#94a3b8' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Peak Hours (Heatmap logic represented via Bar Chart) */}
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div>
                            <h3 className="font-black text-white text-lg tracking-tight">Peak Demand Hours</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Order distribution by time of day</p>
                        </div>
                        <div className="p-3 bg-white/10 text-orange-400 rounded-2xl">
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="h-72 w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={peakHourData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                <XAxis
                                    dataKey="hour"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 8, fontWeight: 900, fill: '#475569' }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)', padding: '12px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 900, color: '#FF6B35' }}
                                    labelStyle={{ fontSize: '10px', fontWeight: 900, marginBottom: '4px', color: '#475569' }}
                                />
                                <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
                                    {peakHourData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.orders > Math.max(...peakHourData.map(d => d.orders)) * 0.8 ? '#FF6B35' : '#1e293b'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Category Popularity */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center">
                    <h3 className="font-black text-slate-900 text-sm tracking-tight mb-8 w-full">Cuisine Market Share</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={cuisineData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {cuisineData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Customer Demographic (Top Spenders) */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm lg:col-span-2">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-2">
                            <Users size={16} className="text-blue-500" /> Platinum Customers
                        </h3>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BY TOTAL LIFETIME VALUE</span>
                    </div>
                    <div className="space-y-4">
                        {data.topCustomers.map((customer, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-100 hover:bg-white transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:text-blue-500 transition-colors">
                                        {customer.name?.[0] || 'C'}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 text-sm">{customer.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{customer.orderCount} Orders placed</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-slate-900">₹{customer.totalSpent.toLocaleString()}</p>
                                    <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Tier 1</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Payment Modes Analysis */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-10 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                    <div className="md:w-1/3">
                        <h3 className="text-2xl font-black mb-4 leading-tight">Checkout Strategy</h3>
                        <p className="text-slate-400 text-sm font-semibold mb-6">Analyze how users prefer to pay. Optimize gateways based on real usage patterns.</p>
                        <div className="grid grid-cols-2 gap-4">
                            {paymentData.map((item, i) => (
                                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.name}</p>
                                    <p className="text-xl font-black">{Math.round((item.value / data.paymentDistribution.reduce((acc, curr) => acc + curr.count, 0)) * 100)}%</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="md:w-2/3 h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={paymentData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 900, fontSize: 10 }} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
                                <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                                    {paymentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <IndianRupee className="absolute -bottom-10 -right-10 text-white/5 w-64 h-64 rotate-12" />
            </div>
        </div>
    );
}
