import React, { useEffect, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import API from '../api/axios';
import { TrendingUp, Clock, Star, Package } from 'lucide-react';

const COLORS = ['#FF6B35', '#F7931E', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

export default function PartnerBI() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await API.get('/analytics/partner/overview');
            setData(res.data.data);
        } catch (err) {
            console.error('Failed to fetch Partner BI data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-96 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing Kitchen Stats...</div>;
    if (!data) return <div className="p-10 text-center text-slate-400">Unable to load analytics data.</div>;

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

    const topItemsData = data.topItems.map(item => ({
        name: item._id,
        value: item.totalSold,
        revenue: item.revenue
    }));

    return (
        <div className="space-y-10 animate-fade-in">

            {/* Revenue & Growth Trend */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="font-black text-slate-900 text-lg tracking-tight">Your Revenue Growth</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Gross sales performance (30 Days)</p>
                    </div>
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                        <TrendingUp size={20} />
                    </div>
                </div>
                <div className="h-80 w-full font-sans">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueTrendData}>
                            <defs>
                                <linearGradient id="colorRevPartner" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
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
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevPartner)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Peak Demand (Busiest Times) */}
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div>
                            <h3 className="font-black text-white text-lg tracking-tight">Rush Hour Analytics</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">When should you staff your kitchen?</p>
                        </div>
                        <div className="p-3 bg-white/10 text-emerald-400 rounded-2xl">
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
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', padding: '12px' }}
                                />
                                <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
                                    {peakHourData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.orders > Math.max(...peakHourData.map(d => d.orders)) * 0.8 ? '#10B981' : '#1e293b'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Items (Popularity) */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-2">
                            <Star size={16} className="text-orange-500 fill-orange-500" /> Best Sellers
                        </h3>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Units Sold</span>
                    </div>

                    <div className="space-y-6">
                        {topItemsData.slice(0, 5).map((item, i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest">
                                    <span className="text-slate-900">{item.name}</span>
                                    <span className="text-orange-600">{item.value} Sold</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${(item.value / Math.max(...topItemsData.map(d => d.value))) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 p-5 bg-orange-50 rounded-2xl border border-orange-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Top Item Revenue</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight">₹{topItemsData[0]?.revenue.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
