import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import API from '../api/axios';
import Hero from '../components/Hero';
import RestaurantCard from '../components/RestaurantCard';
import { SkeletonGrid } from '../components/SkeletonCard';
import { Flame, ChevronRight } from 'lucide-react';

const CATEGORY_FILTERS = ['All', 'Pizza', 'Burgers', 'Sushi', 'Indian', 'Chinese', 'Healthy'];

const CUISINE_EMOJI_MAP = {
  'Pizza': '🍕', 'Sushi': '🍣', 'Burgers': '🍔', 'Indian': '🍛', 'Chinese': '🥡',
  'Healthy': '🥗', 'Italian': '🍝', 'Japanese': '🍱', 'American': '🍟', 'BBQ': '🍗',
  'Biryani': '🥘', 'Desserts': '🍰', 'Beverages': '🥤', 'Bakery': '🥐', 'South Indian': '🍱',
  'Salads': '🥗', 'Cafe': '☕', 'Juices': '🍹', 'Continental': '🍽️', 'Samosas': '🥟',
  'Ramen': '🍜', 'Smoothies': '🥤', 'Pasta': '🍝', 'Chicken': '🍗', 'Seafood': '🍤',
  'Ice Cream': '🍦', 'Steak': '🥩', 'Tacos': '🌮',
  'Sandwich': '🥪', 'Momo': '🥟', 'Kebab': '🍢', 'Rolls': '🌯'
};

const getCuisineEmoji = (c) => {
  if (!c) return '🍽️';
  const normalized = c.trim().toLowerCase();
  if (normalized.includes('samosa')) return '🥟';
  if (normalized.includes('ramen')) return '🍜';
  if (normalized.includes('biryani')) return '🥘';
  if (normalized.includes('burger')) return '🍔';
  if (normalized.includes('chicken')) return '🍗';
  if (normalized.includes('beverage')) return '🥤';
  if (normalized.includes('juice')) return '🍹';
  if (normalized.includes('pizza')) return '🍕';
  
  for (const [key, emoji] of Object.entries(CUISINE_EMOJI_MAP)) {
    if (key.toLowerCase() === normalized) return emoji;
  }
  return '🍽️';
};

const cleanLabel = (label) => {
  if (!label) return '';
  if (label.toLowerCase().includes('chicken')) return 'Chicken';
  if (label.toLowerCase().includes('ramen')) return 'Ramen';
  return label.replace(/^and\s+/i, '').replace(/\.+$/, '').trim();
};

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced Filters
  const [fastDelivery, setFastDelivery] = useState(false);
  const [highRating, setHighRating] = useState(false);
  const [sortBy, setSortBy] = useState('none');

  const cuisineParam = searchParams.get('cuisine') || 'All';
  const [activeFilter, setActiveFilter] = useState(cuisineParam);

  const [selectedCity, setSelectedCity] = React.useState(() => {
    const c = localStorage.getItem('userLocation');
    return (c && c !== 'Select Location') ? c : null;
  });

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
    let isMounted = true;

    const fetchRestaurants = async () => {
      if (!isMounted) return;
      try {
        let city = localStorage.getItem('userLocation');
        if (city && (city === 'Select Location' || city === 'All Cities')) city = undefined;

        const [resResponse, recResponse] = await Promise.all([
          API.get(`/restaurants`, { params: { city: city ? city.trim() : undefined } }),
          API.get('/restaurants/recommendations').catch(e => ({ data: { data: [] } }))
        ]);

        if (isMounted) {
          const list = Array.isArray(resResponse.data) ? resResponse.data : (resResponse.data?.data || []);
          setRestaurants(list);
          setRecommendations(recResponse.data?.data || []);
        }
      } catch (error) {
        console.error('[Home] API Error:', error);
        if (isMounted) setRestaurants([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRestaurants();

    const handleLocChange = () => {
      setSelectedCity(localStorage.getItem('userLocation'));
      setActiveFilter('All');
      setSearchQuery('');
      fetchRestaurants();
    };

    window.addEventListener('locationChanged', handleLocChange);
    return () => {
      isMounted = false;
      window.removeEventListener('locationChanged', handleLocChange);
    };
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearchQuery(q);
      setActiveFilter('All');
    }
  }, [searchParams]);

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

  const dynamicCategories = React.useMemo(() => {
    const cuisineSet = new Set();
    restaurants.forEach(r => {
      if (Array.isArray(r.cuisines)) {
        r.cuisines.forEach(c => {
          if (c) cuisineSet.add(c.charAt(0).toUpperCase() + c.slice(1).toLowerCase());
        });
      }
    });

    const sorted = Array.from(cuisineSet).sort();
    return sorted.map(label => ({
      label,
      emoji: getCuisineEmoji(label),
      color: `from-slate-100 to-slate-50`
    }));
  }, [restaurants]);

  const filtered = restaurants.filter((r) => {
    const activeLower = activeFilter.toLowerCase();
    const searchLower = searchQuery.toLowerCase();

    const matchesCategory =
      activeFilter === 'All' ||
      r.cuisines?.some((c) => c.toLowerCase().includes(activeLower)) ||
      r.menuKeywords?.some((k) => k.includes(activeLower));

    const matchesSearch =
      !searchQuery ||
      r.name.toLowerCase().includes(searchLower) ||
      r.cuisines?.some((c) => (c || '').toLowerCase().includes(searchLower)) ||
      r.menuKeywords?.some((k) => k.includes(searchLower));

    const matchesFast = !fastDelivery || (r.deliveryTime || 30) <= 30;
    const currentRating = parseFloat(r.rating || 4.5);
    const matchesRating = !highRating || currentRating >= 4.5;

    return matchesCategory && matchesSearch && matchesFast && matchesRating;
  }).sort((a, b) => {
    if (sortBy === 'rating') return parseFloat(b.rating || 4.5) - parseFloat(a.rating || 4.5);
    if (sortBy === 'deliveryTime') return (a.deliveryTime || 30) - (b.deliveryTime || 30);
    if (sortBy === 'priceLowHigh') return (a.averagePrice || 500) - (b.averagePrice || 500);
    return 0;
  });

  return (
    <div className="bg-white min-h-screen">
      <Hero onFilterChange={handleHeroFilter} />

      <div className="bg-slate-900 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-full bg-orange-500/10 skew-x-12 blur-3xl" />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 w-full sm:w-auto">
            {[
              { icon: '🚴', text: 'Free delivery', sub: 'on orders ₹299+' },
              { icon: '⚡', text: 'Fast delivery', sub: 'in 30 mins' },
              { icon: '💎', text: 'Premium stores', sub: 'top rated only' },
            ].map(({ icon, text, sub }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div className="flex flex-col">
                  <span className="text-white font-black text-xs uppercase tracking-widest whitespace-nowrap">{text}</span>
                  <span className="text-slate-500 text-[10px] font-bold whitespace-nowrap">{sub}</span>
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

      {/* ── Sticky Filter & Category Bar ─────────────────────────────── */}
      <div className="sticky top-16 z-40 w-full bg-white/90 backdrop-blur-2xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-5 pb-4 flex flex-col gap-5">
          {/* Title + Sort Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div id="restaurant-section">
              <div className="flex items-center gap-3 mb-1">
                <span className="h-0.5 w-10 bg-orange-500 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600">
                  Top Curation for Tenali
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-950 leading-none">
                Discover <span className="text-orange-600">Culinary Excellence</span>
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setFastDelivery(!fastDelivery)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${fastDelivery ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-100 text-slate-500 hover:bg-orange-50 border border-slate-200 hover:border-orange-300'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${fastDelivery ? 'bg-white animate-pulse' : 'bg-orange-500'}`} />
                ⚡ Fast
              </button>
              <button
                onClick={() => setHighRating(!highRating)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 ${highRating ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-100 text-slate-500 hover:bg-orange-50 border border-slate-200 hover:border-orange-300'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${highRating ? 'bg-white animate-pulse' : 'bg-yellow-400'}`} />
                ⭐ 4.5+
              </button>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-5 pr-10 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest bg-slate-950 text-white outline-none cursor-pointer hover:bg-slate-800 transition-all"
                >
                  <option value="none">SORTS</option>
                  <option value="rating">Top Rated</option>
                  <option value="deliveryTime">Fastest first</option>
                  <option value="priceLowHigh">Value for money</option>
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={12} />
              </div>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              { [
                { label: 'All', emoji: '🌎' },
                { label: 'Samosas', emoji: '🥟' },
                { label: 'Ramen', emoji: '🍜' },
                { label: 'Beverages', emoji: '🥤' },
                { label: 'Biryani', emoji: '🥘' },
                { label: 'Burgers', emoji: '🍔' },
                { label: 'Chicken', emoji: '🍗' }
              ].map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => applyFilter(cat.label)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 shrink-0 text-[10px] font-black uppercase tracking-widest border-2 ${
                    activeFilter === cat.label
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xl shadow-orange-100'
                      : 'bg-white text-slate-500 border-slate-100 hover:border-orange-200 hover:bg-orange-50/50'
                  }`}
                >
                  <span className="text-base">{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">



        {!loading && !searchQuery && activeFilter === 'All' && restaurants.length > 3 && (
          <div className="mb-20 animate-fade-up">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-950 tracking-tighter uppercase">Trending <span className="text-orange-500">Near You</span></h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">What your neighbors are ordering right now</p>
              </div>
              <Link to="/" className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline px-4 py-2 bg-orange-50 rounded-xl transition-all">View All →</Link>
            </div>
            <div className="flex gap-8 overflow-x-auto pb-8 scrollbar-none snap-x">
              {restaurants.slice(0, 5).map((res, i) => (
                <div key={res._id + '-trending'} className="min-w-[320px] md:min-w-[380px] snap-start">
                  <RestaurantCard restaurant={res} index={i + 20} />
                </div>
              ))}
            </div>
          </div>
        )}

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

      <div className="bg-slate-950 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-orange-500 text-xs font-black uppercase tracking-widest">Why Food Court?</span>
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

      <div className="bg-gradient-to-br from-orange-500 to-red-600 py-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="text-white max-w-xl">
            <h2 className="text-4xl font-black tracking-tight mb-4">
              Get the Food Court App 📱
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