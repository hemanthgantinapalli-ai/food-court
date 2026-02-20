import React, { useState, useEffect } from 'react';
import { MapPin, Package, Truck, CheckCircle, Clock, Phone, ChevronRight } from 'lucide-react';

const DEMO_ORDER = {
    id: 'FC-2024-8821',
    restaurant: 'The Smoke House',
    items: ['Signature Smash Burger', 'Crispy Chicken Wings', 'Molten Lava Cake'],
    total: 849,
    status: 2, // 0=placed, 1=preparing, 2=on the way, 3=delivered
    rider: { name: 'Rahul K.', phone: '+91 98765 43210', eta: '8 min' },
    address: '42, Green Park, New Delhi – 110016',
};

const STEPS = [
    { label: 'Order Placed', icon: CheckCircle, desc: 'Your order was confirmed' },
    { label: 'Preparing', icon: Clock, desc: 'Restaurant is cooking your food' },
    { label: 'On the Way', icon: Truck, desc: 'Your rider picked up the order' },
    { label: 'Delivered', icon: Package, desc: 'Enjoy your meal!' },
];

export default function TrackOrderPage() {
    const [orderId, setOrderId] = useState('');
    const [tracking, setTracking] = useState(null);
    const [searching, setSearching] = useState(false);

    const handleTrack = () => {
        setSearching(true);
        // Simulate an API fetch
        setTimeout(() => {
            setTracking(DEMO_ORDER);
            setSearching(false);
        }, 1200);
    };

    return (
        <div className="bg-[#F8F9FB] min-h-screen">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 py-16 px-6 text-center">
                <span className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
                    <Truck size={14} /> Live Tracking
                </span>
                <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-4">
                    Track Your Order 📦
                </h1>
                <p className="text-slate-400 text-lg font-medium max-w-xl mx-auto">
                    Enter your order ID below to see real-time delivery status.
                </p>
            </div>

            <div className="max-w-2xl mx-auto px-6 py-12">
                {/* Search Box */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-8">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                        Order ID
                    </label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                            placeholder="e.g. FC-2024-8821"
                            className="flex-1 border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
                        />
                        <button
                            onClick={handleTrack}
                            disabled={searching}
                            className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-black rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
                        >
                            {searching ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>Track <ChevronRight size={16} /></>
                            )}
                        </button>
                    </div>
                    <p className="text-slate-400 text-xs font-medium mt-3">
                        💡 Try entering: <span className="text-orange-500 font-black cursor-pointer" onClick={() => { setOrderId('FC-2024-8821'); }}>FC-2024-8821</span> for a demo
                    </p>
                </div>

                {/* Tracking Result */}
                {tracking && (
                    <div className="space-y-6 animate-fade-up">
                        {/* Order Info */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Order</p>
                                    <p className="text-2xl font-black text-slate-900">{tracking.id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Total</p>
                                    <p className="text-2xl font-black text-orange-500">₹{tracking.total}</p>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-5">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">From</p>
                                <p className="font-black text-slate-900">{tracking.restaurant}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {tracking.items.map((item) => (
                                        <span key={item} className="text-xs bg-orange-50 text-orange-600 font-bold px-3 py-1 rounded-full">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Progress Steps */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                            <h3 className="font-black text-slate-900 text-lg mb-8">Delivery Status</h3>
                            <div className="relative">
                                {/* Progress line */}
                                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100" />
                                <div
                                    className="absolute left-6 top-0 w-0.5 bg-orange-500 transition-all duration-1000"
                                    style={{ height: `${(tracking.status / (STEPS.length - 1)) * 100}%` }}
                                />

                                <div className="space-y-8">
                                    {STEPS.map((step, i) => {
                                        const Icon = step.icon;
                                        const done = i <= tracking.status;
                                        const active = i === tracking.status;
                                        return (
                                            <div key={step.label} className="flex items-start gap-6 relative">
                                                <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${done
                                                        ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-200'
                                                        : 'bg-slate-100'
                                                    }`}>
                                                    <Icon size={20} className={done ? 'text-white' : 'text-slate-400'} />
                                                    {active && (
                                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-ping" />
                                                    )}
                                                </div>
                                                <div className="pt-2">
                                                    <p className={`font-black ${done ? 'text-slate-900' : 'text-slate-400'}`}>
                                                        {step.label}
                                                        {active && <span className="ml-2 text-xs text-orange-500 font-black uppercase tracking-widest">● Now</span>}
                                                    </p>
                                                    <p className="text-slate-400 text-sm font-medium">{step.desc}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Rider Info */}
                        {tracking.status === 2 && (
                            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Your Rider</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center font-black text-xl">
                                            🚴
                                        </div>
                                        <div>
                                            <p className="font-black text-lg">{tracking.rider.name}</p>
                                            <p className="text-slate-400 font-medium text-sm flex items-center gap-1">
                                                <Clock size={12} /> ETA: <span className="text-green-400 font-black">{tracking.rider.eta}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <a
                                        href={`tel:${tracking.rider.phone}`}
                                        className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors"
                                    >
                                        <Phone size={14} /> Call
                                    </a>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Delivering to</p>
                                    <p className="font-bold text-white flex items-start gap-2">
                                        <MapPin size={16} className="text-orange-400 shrink-0 mt-0.5" />
                                        {tracking.address}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
