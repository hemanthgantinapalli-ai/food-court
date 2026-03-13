import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import API from '../api/axios';
import Hero from '../components/Hero';
import RestaurantCard from '../components/RestaurantCard';
import { SkeletonGrid } from '../components/SkeletonCard';
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
    averagePrice: 450,
    location: { address: '42 Gourmet Street', city: 'Mumbai', latitude: 19.0760, longitude: 72.8777 }
  },
  {
    _id: '69a5bdb2d6f8c7e3b91a1062',
    name: '[DEMO] Sakura Japanese',
    image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=80',
    rating: 4.9,
    cuisines: ['Japanese', 'Sushi', 'Ramen'],
    deliveryTime: 30,
    deliveryFee: 49,
    averagePrice: 800,
    location: { address: '12 Tokyo Tower', city: 'Mumbai', latitude: 19.0820, longitude: 72.8888 }
  },
  {
    _id: '69a5bdb2d6f8c7e3b91a1063',
    name: '[DEMO] Bella Italia',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
    rating: 4.7,
    cuisines: ['Italian', 'Pizza', 'Pasta'],
    deliveryTime: 20,
    deliveryFee: 0,
    averagePrice: 600,
    location: { address: '8 Naples Way', city: 'Mumbai', latitude: 19.0900, longitude: 72.8999 }
  },
  {
    _id: '69a5bdb2d6f8c7e3b91a1064',
    name: '[DEMO] Spice Garden',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
    rating: 4.4, // Using 4.4 to test the 4.5+ filter
    cuisines: ['Indian', 'Curry', 'Biryani'],
    deliveryTime: 35,
    deliveryFee: 29,
    averagePrice: 350,
    location: { address: '15 Curry Lane', city: 'Mumbai', latitude: 19.1000, longitude: 72.9000 }
  },
  {
    _id: '69a5bdb2d6f8c7e3b91a1065',
    name: '[DEMO] Green Bowl',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
    rating: 4.5,
    cuisines: ['Healthy', 'Salads', 'Vegan'],
    deliveryTime: 20,
    deliveryFee: 0,
    averagePrice: 300,
    location: { address: '3 Green Terrace', city: 'Mumbai', latitude: 19.1100, longitude: 72.9111 }
  },
  {
    _id: '69a5bdb2d6f8c7e3b91a1066',
    name: '[DEMO] Dragon Palace',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80',
    rating: 4.7,
    cuisines: ['Chinese', 'Dim Sum', 'Noodles'],
    deliveryTime: 40, // Using 40 to test the Fast filter
    deliveryFee: 39,
    averagePrice: 550,
    location: { address: '9 Silk Road', city: 'Mumbai', latitude: 19.1200, longitude: 72.9222 }
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

    // 3. Fast Delivery ( <= 30 mins)
    const matchesFast = !fastDelivery || (r.deliveryTime || 30) <= 30;

    // 4. High Rating ( 4.5+ ) - Use 4.5 as fallback consistent with card display
    const currentRating = parseFloat(r.rating || 4.5);
    const matchesRating = !highRating || currentRating >= 4.5;

    return matchesCategory && matchesSearch && matchesFast && matchesRating;
  }).sort((a, b) => {
    // Advanced sorting logic
    if (sortBy === 'rating') {
      return parseFloat(b.rating || 4.5) - parseFloat(a.rating || 4.5);
    }
    if (sortBy === 'deliveryTime') {
      return (a.deliveryTime || 30) - (b.deliveryTime || 30);
    }
    if (sortBy === 'priceLowHigh') {
      return (a.averagePrice || 500) - (b.averagePrice || 500);
    }
    return 0;
  });

  // loading state is handled inline (skeleton cards) — no full-page spinner needed

  const cuisineEmojis = {
    'Pizza': '🍕', 'Sushi': '🍣', 'Burgers': '🍔', 'Indian': '🍛', 'Chinese': '🥡',
    'Healthy': '🥗', 'Italian': '🍝', 'Japanese': '🍱', 'American': '🍟', 'BBQ': '🍗',
    'Biryani': '🥘', 'Desserts': '🍰', 'Beverages': '🥤', 'Bakery': '🥐', 'South Indian': '🍱',
    'Salads': '🥗', 'Cafe': '☕', 'Juices': '🍹', 'Continental': '🍽️'
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Hero passes onFilterChange so cuisine tags & search work */}
      <Hero onFilterChange={handleHeroFilter} />

      {/* Feature Highlights */}
      <div className="bg-slate-900 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-full bg-orange-500/10 skew-x-12 blur-3xl" />
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-8">
            {[
              { icon: '🚴', text: 'Free delivery', sub: 'on orders ₹299+' },
              { icon: '⚡', text: 'Fast delivery', sub: 'in 30 mins' },
              { icon: '💎', text: 'Premium stores', sub: 'top rated only' },
            ].map(({ icon, text, sub }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div className="flex flex-col">
                  <span className="text-white font-black text-xs uppercase tracking-widest">{text}</span>
                  <span className="text-slate-500 text-[10px] font-bold">{sub}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">150+ Stores Online</span>
          </div>
        </div>
      </div>

      {/* Discovery Feed Section */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Sticky Filters Header */}
        <div className="sticky top-20 z-40 bg-white/70 backdrop-blur-2xl pt-6 pb-8 -mx-6 px-6 mb-10 border-b border-slate-100/80 flex flex-col gap-8 shadow-sm group">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div id="restaurant-section" className="animate-fade-up">
              <div className="flex items-center gap-3 mb-3">
                <span className="h-0.5 w-12 bg-orange-500 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600">
                   Top Curation for {selectedCity || 'Your City'}
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-950 leading-[0.95]">
                Discover<br/> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                  {activeFilter === 'All' ? 'Culinary Excellence' : `Premium ${activeFilter}`}
                </span>
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setFastDelivery(!fastDelivery)}
                className={`group flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${fastDelivery ? 'bg-orange-500 text-white shadow-2xl shadow-orange-500/30' : 'bg-slate-50 text-slate-500 hover:bg-white hover:border-orange-500/30 border border-slate-100'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${fastDelivery ? 'bg-white animate-pulse' : 'bg-orange-500'}`} />
                ⚡ Fast
              </button>
              <button
                onClick={() => setHighRating(!highRating)}
                className={`group flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${highRating ? 'bg-orange-500 text-white shadow-2xl shadow-orange-500/30' : 'bg-slate-50 text-slate-500 hover:bg-white hover:border-orange-500/30 border border-slate-100'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${highRating ? 'bg-white animate-pulse' : 'bg-yellow-400'}`} />
                ⭐ 4.5+
              </button>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-6 pr-12 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-slate-950 text-white border border-transparent outline-none cursor-pointer hover:bg-slate-900 transition-all shadow-xl"
                >
                  <option value="none">SORTS</option>
                  <option value="rating">Top Rated</option>
                  <option value="deliveryTime">Fastest first</option>
                  <option value="priceLowHigh">Value for money</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
          </div>

          {/* Icon Based Categories Bar */}
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
            {['All', ...Array.from(new Set(restaurants.flatMap(r => r.cuisines || [])))].sort().map((cuisine) => (
              <button
                key={cuisine}
                onClick={() => applyFilter(cuisine)}
                className={`group flex items-center gap-3 px-6 py-3.5 rounded-2xl transition-all duration-300 ${activeFilter === cuisine
                    ? 'bg-orange-500 text-white shadow-xl shadow-orange-100 translate-y-[-2px]'
                    : 'bg-white border border-slate-100 text-slate-600 hover:border-orange-500 hover:bg-orange-50/50'
                  }`}
              >
                <span className={`text-xl transition-transform group-hover:scale-125 ${activeFilter === cuisine ? 'scale-110' : ''}`}>
                  {cuisine === 'All' ? '🌎' : (cuisineEmojis[cuisine] || '🍽️')}
                </span>
                <span className="text-[11px] font-black uppercase tracking-widest text-inherit whitespace-nowrap">
                  {cuisine}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Section Message */}
        {searchQuery && (
          <div className="flex items-center gap-4 mb-8 p-4 bg-orange-50 rounded-2xl border border-orange-100">
            <div className="p-2 bg-orange-500 text-white rounded-lg">
              <Flame size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Searching for &quot;{searchQuery}&quot;</p>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">{filtered.length} matching restaurants found</p>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="ml-auto text-orange-500 hover:text-orange-700 p-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* AI Recommendations Section (Only on main view) */}
        {!loading && recommendations.length > 0 && !searchQuery && activeFilter === 'All' && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Recommended <span className="text-orange-500">For You</span></h3>
              <div className="h-px bg-slate-100 flex-1 ml-6 hidden md:block" />
            </div>
            <div className="flex gap-8 overflow-x-auto pb-8 scrollbar-none snap-x transition-all">
              {recommendations.map((res, i) => (
                <div key={res._id} className="min-w-[320px] md:min-w-[380px] snap-start">
                  <RestaurantCard restaurant={res} index={i + 10} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Store Grid — shows skeleton cards while loading */}
        {loading ? (
          <SkeletonGrid count={6} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-x-10 md:gap-y-12">
            {filtered.length > 0 ? (
              filtered.map((res, i) => (
                <RestaurantCard key={res._id} restaurant={res} index={i} />
              ))
            ) : (
              <div className="col-span-full py-24 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-4xl mb-6 grayscale opacity-50">
                  🍜
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">No matching stores found</h3>
                <p className="text-slate-500 font-medium mb-8 max-w-sm">
                  We couldn't find &quot;{searchQuery || activeFilter}&quot; in your current filters. Try relaxing your search for better results.
                </p>
                <button
                  onClick={() => {
                    applyFilter('All');
                    setSearchQuery('');
                    setFastDelivery(false);
                    setHighRating(false);
                  }}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-orange-500 transition-all shadow-xl shadow-slate-200"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
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