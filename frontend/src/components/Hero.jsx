import React, { useState } from 'react';
import { Search, MapPin, Star, Clock, Truck, ChevronDown } from 'lucide-react';

const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
];

const CUISINE_TAGS = ['🍕 Pizza', '🍣 Sushi', '🍔 Burgers', '🌮 Tacos', '🍜 Noodles', '🥗 Healthy'];

const Hero = () => {
  const [activeTag, setActiveTag] = useState('🍕 Pizza');
  const [searchVal, setSearchVal] = useState('');

  return (
    <div className="relative min-h-[92vh] flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950">

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, #f97316 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Glow blobs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-red-600/15 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left Content */}
        <div className="animate-fade-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-orange-500/10 border border-orange-500/30 rounded-full">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-orange-400 text-xs font-bold uppercase tracking-widest">Now delivering in 20+ cities</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.95] tracking-tighter mb-6">
            Delicious<br />
            Food <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Delivered</span><br />
            Fast.
          </h1>

          <p className="text-slate-400 text-lg font-medium leading-relaxed mb-10 max-w-md">
            Order from the best local restaurants with easy, on-demand delivery.
            Fresh, fast, and flavorful — right at your doorstep.
          </p>

          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-5 flex items-center">
              <MapPin className="text-orange-500" size={20} />
            </div>
            <input
              type="text"
              placeholder="Enter your delivery address..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-14 pr-44 py-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-slate-500 font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all text-base"
            />
            <button className="absolute right-2 top-2 bottom-2 px-8 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95">
              Find Food
            </button>
          </div>

          {/* Cuisine Tags */}
          <div className="flex flex-wrap gap-2 mb-10">
            {CUISINE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTag === tag
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white border border-white/10'
                  }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-8">
            {[
              { icon: Star, label: 'Top Rated', value: '4.9★', color: 'text-yellow-400' },
              { icon: Clock, label: 'Avg. Delivery', value: '20 Min', color: 'text-green-400' },
              { icon: Truck, label: 'Restaurants', value: '1,200+', color: 'text-blue-400' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex flex-col">
                <span className={`font-black text-xl ${color}`}>{value}</span>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Image Collage */}
        <div className="relative hidden lg:flex items-center justify-center">
          {/* Main large image */}
          <div className="relative w-80 h-80 rounded-[3rem] overflow-hidden shadow-2xl shadow-orange-500/20 border border-white/10 animate-float">
            <img
              src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700&q=80"
              alt="Delicious Pizza"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          {/* Floating card: top-left */}
          <div className="absolute -top-4 -left-8 bg-white rounded-2xl p-4 shadow-2xl border border-slate-100 w-44">
            <img
              src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80"
              alt="Burger"
              className="w-full h-24 object-cover rounded-xl mb-3"
            />
            <p className="font-black text-slate-900 text-sm">Smash Burger</p>
            <p className="text-orange-600 font-black text-sm">₹299</p>
          </div>

          {/* Floating card: bottom-right */}
          <div className="absolute -bottom-8 -right-4 bg-white rounded-2xl p-4 shadow-2xl border border-slate-100 w-48">
            <img
              src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&q=80"
              alt="Sushi"
              className="w-full h-24 object-cover rounded-xl mb-3"
            />
            <p className="font-black text-slate-900 text-sm">Premium Sushi</p>
            <div className="flex items-center justify-between">
              <p className="text-orange-600 font-black text-sm">₹599</p>
              <div className="flex items-center gap-1">
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-black text-slate-500">4.9</span>
              </div>
            </div>
          </div>

          {/* Delivery badge */}
          <div className="absolute top-1/2 -right-10 transform -translate-y-1/2 bg-green-500 text-white rounded-2xl p-4 shadow-xl">
            <Clock size={20} className="mb-1" />
            <p className="font-black text-xs">20 MIN</p>
            <p className="text-green-200 text-[10px]">Delivery</p>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600 animate-bounce">
        <span className="text-xs font-bold uppercase tracking-widest">Scroll</span>
        <ChevronDown size={16} />
      </div>
    </div>
  );
};

export default Hero;