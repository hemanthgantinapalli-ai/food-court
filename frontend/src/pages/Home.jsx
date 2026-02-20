import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Hero from '../components/Hero';
import RestaurantCard from '../components/RestaurantCard';
import Loader_Component from '../components/Loader';
import { Flame, ChevronRight } from 'lucide-react';

const CATEGORY_FILTERS = ['All', 'Pizza', 'Burgers', 'Sushi', 'Indian', 'Chinese', 'Healthy'];

// Curated fallback restaurants for when backend is offline
const FALLBACK_RESTAURANTS = [
  {
    _id: '1',
    name: 'The Smoke House',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
    rating: 4.8,
    cuisines: ['American', 'Burgers', 'BBQ'],
    deliveryTime: 25,
    deliveryFee: 0,
  },
  {
    _id: '2',
    name: 'Sakura Japanese',
    image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=80',
    rating: 4.9,
    cuisines: ['Japanese', 'Sushi', 'Ramen'],
    deliveryTime: 30,
    deliveryFee: 49,
  },
  {
    _id: '3',
    name: 'Bella Italia',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
    rating: 4.7,
    cuisines: ['Italian', 'Pizza', 'Pasta'],
    deliveryTime: 20,
    deliveryFee: 0,
  },
  {
    _id: '4',
    name: 'Spice Garden',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
    rating: 4.6,
    cuisines: ['Indian', 'Curry', 'Biryani'],
    deliveryTime: 35,
    deliveryFee: 29,
  },
  {
    _id: '5',
    name: 'Green Bowl',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
    rating: 4.5,
    cuisines: ['Healthy', 'Salads', 'Vegan'],
    deliveryTime: 20,
    deliveryFee: 0,
  },
  {
    _id: '6',
    name: 'Dragon Palace',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80',
    rating: 4.7,
    cuisines: ['Chinese', 'Dim Sum', 'Noodles'],
    deliveryTime: 30,
    deliveryFee: 39,
  },
];

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const { data } = await axios.get('/api/restaurants');
        setRestaurants(data?.length ? data : FALLBACK_RESTAURANTS);
      } catch (error) {
        console.warn('Backend offline — using demo data:', error.message);
        setRestaurants(FALLBACK_RESTAURANTS);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  if (loading) return <Loader_Component message="Curating the best kitchens..." />;

  // Handle filter from Hero cuisine tags or search
  const handleHeroFilter = (query) => {
    // Check if it matches a known category
    const matched = CATEGORY_FILTERS.find(
      (f) => f.toLowerCase() === query.toLowerCase()
    );
    if (matched) {
      setActiveFilter(matched);
      setSearchQuery('');
    } else {
      setSearchQuery(query);
      setActiveFilter('All');
    }
  };

  // Combine category filter + text search
  const filtered = restaurants.filter((r) => {
    const matchesCategory =
      activeFilter === 'All' ||
      r.cuisines?.some((c) => c.toLowerCase().includes(activeFilter.toLowerCase()));

    const matchesSearch =
      !searchQuery ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cuisines?.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-white min-h-screen">
      {/* Hero passes onFilterChange so cuisine tags & search work */}
      <Hero onFilterChange={handleHeroFilter} />

      {/* Feature Highlights */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-8 md:gap-16">
          {[
            { icon: '🚴', text: 'Free delivery on first 3 orders' },
            { icon: '⚡', text: 'Lightning fast 20-min delivery' },
            { icon: '🛡️', text: '100% secure payments' },
            { icon: '🔄', text: 'Easy returns & refunds' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-white font-bold text-sm">
              <span className="text-xl">{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Trending Categories */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <span className="text-[10px] font-black tracking-[0.3em] text-orange-500 uppercase mb-2 block">
              What are you craving?
            </span>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900">
              Browse by <span className="text-orange-500">Category</span>
            </h2>
          </div>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-16">
          {[
            { label: 'Pizza', emoji: '🍕', color: 'from-orange-100 to-orange-50' },
            { label: 'Sushi', emoji: '🍣', color: 'from-pink-100 to-pink-50' },
            { label: 'Burgers', emoji: '🍔', color: 'from-yellow-100 to-yellow-50' },
            { label: 'Indian', emoji: '🍛', color: 'from-amber-100 to-amber-50' },
            { label: 'Chinese', emoji: '🥡', color: 'from-red-100 to-red-50' },
            { label: 'Healthy', emoji: '🥗', color: 'from-green-100 to-green-50' },
          ].map(({ label, emoji, color }) => (
            <button
              key={label}
              onClick={() => {
                setActiveFilter(activeFilter === label ? 'All' : label);
                setSearchQuery('');
                document.getElementById('restaurant-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`group flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-br ${color} border border-transparent hover:border-orange-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${activeFilter === label ? 'ring-2 ring-orange-500 shadow-lg shadow-orange-100' : ''
                }`}
            >
              <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{emoji}</span>
              <span className="text-xs font-black text-slate-700 tracking-wide">{label}</span>
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => { setActiveFilter(filter); setSearchQuery(''); }}
              className={`shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeFilter === filter
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                }`}
            >
              {filter}
            </button>
          ))}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm bg-orange-500 text-white"
            >
              "{searchQuery}" ✕
            </button>
          )}
        </div>

        {/* Section Header — anchored so Hero scroll works */}
        <div id="restaurant-section" className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="text-orange-500" size={20} />
              <span className="text-[10px] font-black tracking-[0.2em] text-orange-500 uppercase">
                {searchQuery ? `Results for "${searchQuery}"` : activeFilter === 'All' ? 'Trending Now' : activeFilter}
              </span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900">
              {searchQuery ? 'Search' : activeFilter === 'All' ? 'Popular' : activeFilter}{' '}
              <span className="text-slate-400">Near You</span>
            </h2>
          </div>

          <div
            className="flex items-center gap-2 text-orange-600 font-bold text-sm cursor-pointer hover:gap-3 transition-all"
            onClick={() => { setActiveFilter('All'); setSearchQuery(''); }}
          >
            View All Restaurants <ChevronRight size={16} />
          </div>
        </div>

        {/* Restaurant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.length > 0 ? (
            filtered.map((res) => (
              <RestaurantCard key={res._id} restaurant={res} />
            ))
          ) : (
            <div className="col-span-3 py-20 text-center text-slate-400">
              <span className="text-5xl block mb-4">🔍</span>
              <p className="font-black text-xl">
                No restaurants found for "{searchQuery || activeFilter}"
              </p>
              <button
                onClick={() => { setActiveFilter('All'); setSearchQuery(''); }}
                className="mt-4 text-orange-500 font-bold"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="bg-slate-950 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-orange-500 text-xs font-black uppercase tracking-widest">Why FoodCourt?</span>
            <h2 className="text-4xl font-black text-white tracking-tight mt-3">
              The <span className="text-orange-500">Premium</span> Food Experience
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '⚡',
                title: 'Lightning Delivery',
                desc: 'Your order in under 30 minutes — guaranteed. Real-time tracking keeps you in the loop.',
                color: 'from-orange-500/20 to-orange-500/5',
                border: 'border-orange-500/20',
              },
              {
                icon: '👨‍🍳',
                title: 'Top Chefs Only',
                desc: 'We partner exclusively with 4.5★+ rated kitchens. No compromises, only excellence.',
                color: 'from-yellow-500/20 to-yellow-500/5',
                border: 'border-yellow-500/20',
              },
              {
                icon: '🛡️',
                title: 'Safe & Secure',
                desc: 'Encrypted payments, tamper-proof packaging, and 100% hygiene standards at every step.',
                color: 'from-green-500/20 to-green-500/5',
                border: 'border-green-500/20',
              },
            ].map(({ icon, title, desc, color, border }) => (
              <div
                key={title}
                className={`bg-gradient-to-br ${color} border ${border} rounded-3xl p-8 hover:-translate-y-2 transition-all duration-300`}
              >
                <div className="w-14 h-14 flex items-center justify-center text-3xl mb-6 bg-white/5 rounded-2xl">
                  {icon}
                </div>
                <h3 className="text-white font-black text-xl mb-3">{title}</h3>
                <p className="text-slate-400 leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* App Download CTA */}
      <div className="bg-gradient-to-br from-orange-500 to-red-600 py-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="text-white max-w-xl">
            <h2 className="text-4xl font-black tracking-tight mb-4">
              Get the FoodCourt App 📱
            </h2>
            <p className="text-orange-100 font-medium text-lg leading-relaxed mb-8">
              Order faster, track in real-time, and unlock exclusive deals.
              Available on iOS & Android — free forever.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="flex items-center gap-3 bg-black text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-slate-900 transition-colors">
                <span className="text-2xl">🍎</span>
                <div className="text-left">
                  <div className="text-[10px] opacity-70 uppercase tracking-widest">Download on the</div>
                  <div className="font-black">App Store</div>
                </div>
              </button>
              <button className="flex items-center gap-3 bg-black text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-slate-900 transition-colors">
                <span className="text-2xl">🤖</span>
                <div className="text-left">
                  <div className="text-[10px] opacity-70 uppercase tracking-widest">Get it on</div>
                  <div className="font-black">Google Play</div>
                </div>
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            {[
              'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80',
              'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=80',
            ].map((src, i) => (
              <div
                key={i}
                className={`w-32 h-48 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 ${i === 1 ? 'mt-6' : ''}`}
              >
                <img src={src} alt="App preview" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;