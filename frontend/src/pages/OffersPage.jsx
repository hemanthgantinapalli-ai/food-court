import React, { useState } from 'react';
import { Tag, Clock, Copy, CheckCheck, Flame } from 'lucide-react';

const OFFERS = [
    {
        id: 1,
        code: 'FIRST50',
        title: '50% OFF on first order',
        desc: 'Get 50% off up to ₹150 on your very first FoodCourt order.',
        expiry: 'Valid till 31 Mar 2026',
        color: 'from-orange-500 to-red-500',
        emoji: '🎉',
        category: 'New User',
    },
    {
        id: 2,
        code: 'PIZZA40',
        title: '40% OFF on Pizza',
        desc: 'Use this on any pizza order above ₹299. Max discount ₹120.',
        expiry: 'Valid till 28 Feb 2026',
        color: 'from-yellow-500 to-orange-500',
        emoji: '🍕',
        category: 'Category Deal',
    },
    {
        id: 3,
        code: 'FREEDEL',
        title: 'Free Delivery',
        desc: 'Get free delivery on your next 5 orders. No minimum order value.',
        expiry: 'Valid till 15 Mar 2026',
        color: 'from-green-500 to-teal-500',
        emoji: '🚴',
        category: 'Delivery',
    },
    {
        id: 4,
        code: 'WEEKEND30',
        title: '30% OFF on Weekends',
        desc: 'Every Saturday & Sunday, enjoy 30% off sitewide. Max discount ₹200.',
        expiry: 'Valid every Sat & Sun',
        color: 'from-purple-500 to-indigo-500',
        emoji: '🥳',
        category: 'Weekend Special',
    },
    {
        id: 5,
        code: 'SUSHI25',
        title: '25% OFF on Sushi',
        desc: 'Flat 25% off on all sushi orders above ₹399.',
        expiry: 'Valid till 10 Mar 2026',
        color: 'from-pink-500 to-rose-500',
        emoji: '🍣',
        category: 'Category Deal',
    },
    {
        id: 6,
        code: 'COMBO199',
        title: 'Combo Meals at ₹199',
        desc: 'Select combo meals available at just ₹199. Limited time offer.',
        expiry: 'Valid till 5 Mar 2026',
        color: 'from-blue-500 to-cyan-500',
        emoji: '🍱',
        category: 'Combo',
    },
];

export default function OffersPage() {
    const [copiedCode, setCopiedCode] = useState(null);

    const handleCopy = (code) => {
        navigator.clipboard.writeText(code).catch(() => { });
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    return (
        <div className="bg-[#F8F9FB] min-h-screen">
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 py-16 px-6 text-center">
                <span className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6">
                    <Flame size={14} /> Hot Deals
                </span>
                <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-4">
                    Today's Best Offers 🎁
                </h1>
                <p className="text-orange-100 text-lg font-medium max-w-xl mx-auto">
                    Handpicked deals to save big on every order. Copy a code and enjoy!
                </p>
            </div>

            {/* Offers Grid */}
            <div className="max-w-6xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {OFFERS.map((offer) => (
                        <div
                            key={offer.id}
                            className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                        >
                            {/* Card Header */}
                            <div className={`bg-gradient-to-r ${offer.color} p-6 text-white`}>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-4xl">{offer.emoji}</span>
                                    <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
                                        {offer.category}
                                    </span>
                                </div>
                                <h2 className="text-xl font-black leading-tight">{offer.title}</h2>
                            </div>

                            {/* Card Body */}
                            <div className="p-6">
                                <p className="text-slate-500 font-medium text-sm mb-5 leading-relaxed">
                                    {offer.desc}
                                </p>

                                {/* Coupon Code */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex-1 border-2 border-dashed border-orange-200 bg-orange-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
                                        <Tag size={14} className="text-orange-500" />
                                        <span className="font-black text-orange-600 tracking-widest text-sm">
                                            {offer.code}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(offer.code)}
                                        className={`p-2.5 rounded-xl font-bold transition-all ${copiedCode === offer.code
                                                ? 'bg-green-500 text-white'
                                                : 'bg-slate-900 text-white hover:bg-orange-500'
                                            }`}
                                    >
                                        {copiedCode === offer.code ? (
                                            <CheckCheck size={18} />
                                        ) : (
                                            <Copy size={18} />
                                        )}
                                    </button>
                                </div>

                                {/* Expiry */}
                                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                                    <Clock size={12} />
                                    {offer.expiry}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
