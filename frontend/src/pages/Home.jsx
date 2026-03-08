import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import API from '../api/axios';
import Hero from '../components/Hero';
import RestaurantCard from '../components/RestaurantCard';
import Loader_Component from '../components/Loader';
import { Flame, ChevronRight } from 'lucide-react';

const CATEGORY_FILTERS = ['All', 'Pizza', 'Burgers', 'Sushi', 'Indian', 'Chinese', 'Healthy'];

// Curated fallback restaurants for when backend is offline
const FALLBACK_RESTAURANTS = [
  {
    _id: '69a5bdb2d6f8c7e3b91a1061',
    name: '[DEMO] Smoke House',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
    rating: 4.8,
    cuisines: ['American', 'Burgers', 'BBQ'],
    deliveryTime: 25,
    deliveryFee: 0,
  },
  {
    _id: '69a5bdb2d6f8c7e3b91a1062',
    name: '[DEMO] Sakura Japanese',
    image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=80',
    rating: 4.9,
    cuisines: ['Japanese', 'Sushi', 'Ramen'],
    deliveryTime: 30,
    deliveryFee: 49,
  },
  {
    _id: '69a5bdb2d6f8c7e3b91a1063',
    name: '[DEMO] Bella Italia',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
    rating: 4.7,
    cuisines: ['Italian', 'Pizza', 'Pasta'],
    deliveryTime: 20,
    deliveryFee: 0,
  },
  {
    _id: '69a5bdb2d6f8c7e3b91a1064',
    name: '[DEMO] Spice Garden',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
    rating: 4.6,
    cuisines: ['Indian', 'Curry', 'Biryani'],
    deliveryTime: 35,
    deliveryFee: 29,
  },
  {
    _id: '69a5bdb2d6f8c7e3b91a1065',
    name: '[DEMO] Green Bowl',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
    rating: 4.5,
    cuisines: ['Healthy', 'Salads', 'Vegan'],
    deliveryTime: 20,
    deliveryFee: 0,
  },
  {
    _id: '69a5bdb2d6f8c7e3b91a1066',
    name: '[DEMO] Dragon Palace',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80',
    rating: 4.7,
    cuisines: ['Chinese', 'Dim Sum', 'Noodles'],
    deliveryTime: 30,
    deliveryFee: 39,
  },
];

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced Filters
  const [fastDelivery, setFastDelivery] = useState(false);
  const [highRating, setHighRating] = useState(false);
  const [sortBy, setSortBy] = useState('none'); // 'rating', 'deliveryTime', 'none'

  // Read ?cuisine= from URL on mount so category links work
  const cuisineParam = searchParams.get('cuisine') || 'All';
  const [activeFilter, setActiveFilter] = useState(cuisineParam);

  // Track the selected city for display in the UI
  const [selectedCity, setSelectedCity] = React.useState(() => {
    const c = localStorage.getItem('userLocation');
    return (c && c !== 'Select Location') ? c : null;
  });

  // Sync filter → URL so browser back/forward works
  const applyFilter = (filter) => {
    setActiveFilter(filter);
    setSearchQuery('');
    if (filter === 'All') {
      setSearchParams({});
    } else {
      setSearchParams({ cuisine: filter });
    }
  };

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        let city = localStorage.getItem('userLocation');
        if (city && city === 'Select Location') city = undefined;

        console.log(`[Home] Fetching restaurants for city: "${city}"`);

        const [resResponse, recResponse] = await Promise.all([
          API.get(`/restaurants`, { params: { city: city ? city.trim() : undefined } }),
          API.get('/restaurants/recommendations').catch(e => ({ data: { data: [] } }))
        ]);

        console.log('[Home] Backend response:', resResponse.data);
        const list = Array.isArray(resResponse.data) ? resResponse.data : (resResponse.data?.data || []);

        setRestaurants(list);
        setRecommendations(recResponse.data?.data || []);

        if (list.length === 0) {
          console.warn(`[Home] No restaurants found in ${city}.`);
          // Note: We no longer clobber setRestaurants(list) with FALLBACK_RESTAURANTS 
          // because if the user has selected a city, we want them to see 0 results, 
          // not fake results from Mumbai.
        }
      } catch (error) {
        console.error('[Home] API Error:', error);
        // On hard error, fallback to demo data so the app doesn't look dead
        setRestaurants(FALLBACK_RESTAURANTS);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();

    // Listen for custom locationChanged events from Header
    const handleLocChange = () => {
      const newCity = localStorage.getItem('userLocation');
      setSelectedCity((newCity && newCity !== 'Select Location') ? newCity : null);
      setActiveFilter('All');
      setSearchQuery('');
      fetchRestaurants();
    };

    window.addEventListener('locationChanged', handleLocChange);
    return () => window.removeEventListener('locationChanged', handleLocChange);
  }, []);

  // Sync searchQuery with URL q= parameter
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearchQuery(q);
      setActiveFilter('All');
    }
  }, [searchParams]);

  // Handle filter from Hero cuisine tags or search bar
  const handleHeroFilter = (query) => {
    const matched = CATEGORY_FILTERS.find(
      (f) => f.toLowerCase() === query.toLowerCase()
    );
    if (matched) {
      applyFilter(matched);
    } else {
      setSearchQuery(query);
      setActiveFilter('All');
      setSearchParams({});
    }
  };

  // Dynamic categories derived from data
  const dynamicCategories = React.useMemo(() => {
    const cuisineSet = new Set();
    restaurants.forEach(r => {
      if (Array.isArray(r.cuisines)) {
        r.cuisines.forEach(c => {
          if (c) cuisineSet.add(c.charAt(0).toUpperCase() + c.slice(1).toLowerCase());
        });
      }
    });

    // Sort and limit/map with emojis
    const emojis = {
      'Pizza': '🍕', 'Sushi': '🍣', 'Burgers': '🍔', 'Indian': '🍛', 'Chinese': '🥡',
      'Healthy': '🥗', 'Italian': '🍝', 'Japanese': '🍱', 'American': '🍟', 'BBQ': '🍗',
      'Biryani': '🥘', 'Desserts': '🍰', 'Beverages': '🥤', 'Bakery': '🥐'
    };

    const sorted = Array.from(cuisineSet).sort();
    return sorted.map(label => ({
      label,
      emoji: emojis[label] || '🍽️',
      color: `from-slate-100 to-slate-50` // Default color
    }));
  }, [restaurants]);

  useEffect(() => {
    // Also update CATEGORY_FILTERS-like list for the pill filters
    // (We could use the set here too)
  }, [restaurants]);

  // Combined category filter + text search
  const filtered = restaurants.filter((r) => {
    const matchesCategory =
      activeFilter === 'All' ||
      r.cuisines?.some((c) => c.toLowerCase() === activeFilter.toLowerCase());

    const matchesSearch =
      !searchQuery ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cuisines?.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

    // 3. Fast Delivery ( < 30 mins)
    const matchesFast = !fastDelivery || (r.deliveryTime || 30) < 30;

    // 4. High Rating ( 4.5+ )
    const matchesRating = !highRating || parseFloat(r.rating || 0) >= 4.5;

    return matchesCategory && matchesSearch && matchesFast && matchesRating;
  }).sort((a, b) => {
    if (sortBy === 'rating') return parseFloat(b.rating || 0) - parseFloat(a.rating || 0);
    if (sortBy === 'deliveryTime') return (a.deliveryTime || 30) - (b.deliveryTime || 30);
    if (sortBy === 'priceLowHigh') return (a.averagePrice || 0) - (b.averagePrice || 0);
    // Actually, sorting by restaurant name if price is not available.
    return 0;
  });

  if (loading) return <Loader_Component message="Curating the best kitchens..." />;

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

      {/* AI Recommendations Section */}
      {!loading && recommendations.length > 0 && !searchQuery && activeFilter === 'All' && (
        <div className="bg-orange-50/50 py-16 overflow-hidden border-b border-orange-100/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[10px] font-black tracking-[0.3em] text-orange-500 uppercase mb-2 block animate-pulse">
                  Based on your history
                </span>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">
                  Recommended <span className="text-orange-500">For You</span>
                </h2>
              </div>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-none snap-x transition-all">
              {recommendations.map((res, i) => (
                <div key={res._id} className="min-w-[300px] md:min-w-[350px] snap-start">
                  <RestaurantCard restaurant={res} index={i + 4} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trending Now Horizontal Section */}
      <div className="bg-slate-50/50 py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-[10px] font-black tracking-[0.3em] text-orange-500 uppercase mb-2 block animate-pulse">
                Hot & Fast
              </span>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                Trending <span className="text-orange-500">Now</span>
              </h2>
            </div>
            <div className="hidden md:flex gap-2">
              <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:bg-white transition-all">←</div>
              <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:bg-white transition-all">→</div>
            </div>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-none snap-x transition-all">
            {restaurants.filter(r => r.rating >= 4.0).slice(0, 10).map((res, i) => (
              <div key={res._id} className="min-w-[300px] md:min-w-[350px] snap-start">
                <RestaurantCard restaurant={res} index={i} />
              </div>
            ))}
          </div>
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
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none mb-16 px-1">
          {dynamicCategories.length > 0 ? (
            dynamicCategories.slice(0, 10).map(({ label, emoji, color }) => (
              <button
                key={label}
                onClick={() => {
                  applyFilter(activeFilter === label ? 'All' : label);
                  document.getElementById('restaurant-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`group shrink-0 w-32 flex flex-col items-center gap-3 p-6 rounded-3xl bg-white border border-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-orange-100 ${activeFilter === label ? 'ring-2 ring-orange-500 shadow-xl shadow-orange-100 bg-orange-50/30' : ''}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-all ${activeFilter === label ? 'bg-orange-500/20' : 'bg-slate-50'}`}>
                  {emoji}
                </div>
                <span className="text-[10px] font-black text-slate-800 tracking-widest uppercase">{label}</span>
              </button>
            ))
          ) : (
            // Fallback while loading
            [1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="w-32 h-32 bg-slate-50 rounded-3xl animate-pulse" />
            ))
          )}
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-2 scrollbar-none">
          {['All', ...dynamicCategories.map(c => c.label)].map((filter) => (
            <button
              key={filter}
              onClick={() => applyFilter(filter)}
              className={`shrink-0 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeFilter === filter
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
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

          {/* Vertical Divider */}
          <div className="w-px h-8 bg-slate-200 shrink-0 mx-2 hidden md:block" />

          {/* Quick Filters */}
          <button
            onClick={() => setFastDelivery(!fastDelivery)}
            className={`shrink-0 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${fastDelivery ? 'bg-orange-500 text-white border-orange-400 shadow-lg' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}
          >
            ⚡ Fast Delivery
          </button>
          <button
            onClick={() => setHighRating(!highRating)}
            className={`shrink-0 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${highRating ? 'bg-orange-500 text-white border-orange-400 shadow-lg' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}
          >
            ⭐ 4.5+ Rated
          </button>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="shrink-0 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border bg-white text-slate-500 border-slate-100 hover:bg-slate-50 outline-none cursor-pointer"
          >
            <option value="none">SORT BY</option>
            <option value="rating">Rating: High to Low</option>
            <option value="deliveryTime">Delivery: Fast to Slow</option>
            <option value="priceLowHigh">Cost: Low to High</option>
          </select>
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
              {searchQuery ? 'Search' : activeFilter === 'All' ? 'Discover' : activeFilter}{' '}
              <span className="text-slate-400">Near You</span>
              <span className="ml-3 text-sm font-bold text-orange-500 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-widest align-middle">
                {filtered.length} stores
              </span>
            </h2>
            {selectedCity && (
              <p className="text-sm text-slate-400 font-medium mt-1">
                Showing results in <span className="font-bold text-slate-700">{selectedCity}</span>
                {' · '}
                <button onClick={() => { localStorage.setItem('userLocation', 'Select Location'); window.dispatchEvent(new Event('locationChanged')); }} className="text-orange-500 font-bold hover:underline">
                  View all cities
                </button>
              </p>
            )}
          </div>

          <div
            className="flex items-center gap-2 text-orange-600 font-bold text-sm cursor-pointer hover:gap-3 transition-all"
            onClick={() => applyFilter('All')}
          >
            View All Restaurants <ChevronRight size={16} />
          </div>
        </div>

        {/* Restaurant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.length > 0 ? (
            filtered.map((res, i) => (
              <RestaurantCard key={res._id} restaurant={res} index={i} />
            ))
          ) : restaurants.length > 0 ? (
            // Restaurants exist but don't match the filter
            <div className="col-span-3 py-20 text-center text-slate-400">
              <span className="text-5xl block mb-4">🔍</span>
              <p className="font-black text-xl mb-2">
                No restaurants match &quot;{searchQuery || activeFilter}&quot;
              </p>
              <button
                onClick={() => applyFilter('All')}
                className="mt-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all"
              >
                Show All Restaurants
              </button>
            </div>
          ) : (
            // No restaurants at all — shouldn't happen thanks to backend fallback
            <div className="col-span-3 py-20 text-center text-slate-400">
              <span className="text-5xl block mb-4">🏗️</span>
              <p className="font-black text-xl mb-2">No restaurants available yet</p>
              <p className="text-sm font-medium mb-4">New stores are being added to your area soon!</p>
              <button
                onClick={() => { localStorage.setItem('userLocation', 'Select Location'); window.dispatchEvent(new Event('locationChanged')); }}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-orange-500 transition-all"
              >
                Browse All Cities
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