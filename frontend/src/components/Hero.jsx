import React, { useState, useRef } from 'react';
import { Search, MapPin, Star, Clock, Truck, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CUISINE_TAGS = [
  { label: '🍕 Pizza', filter: 'Pizza' },
  { label: '🍣 Sushi', filter: 'Sushi' },
  { label: '🍔 Burgers', filter: 'Burgers' },
  { label: '🌮 Tacos', filter: 'Indian' },
  { label: '🍜 Noodles', filter: 'Chinese' },
  { label: '🥗 Healthy', filter: 'Healthy' },
];

const Hero = ({ onFilterChange }) => {
  const [activeTag, setActiveTag] = useState('🍕 Pizza');
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState({ restaurants: [], items: [] });
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const searchTimeout = useRef(null);

  const fetchResults = async (q) => {
    if (!q.trim()) {
      setSearchResults({ restaurants: [], items: [] });
      return;
    }
    try {
      const { data } = await axios.get(`/api/restaurants/search/global?q=${q}`);
      setSearchResults({
        restaurants: data.restaurants || [],
        items: data.items || []
      });
    } catch (err) {
      console.error("Search failed");
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    setShowResults(true);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchResults(val), 300);
  };

  const handleTagClick = (tag) => {
    setActiveTag(tag.label);
    if (onFilterChange) onFilterChange(tag.filter);
    // Scroll down to restaurant section
    const section = document.getElementById('restaurant-section');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearch = () => {
    if (!searchVal.trim()) {
      // Just scroll to restaurants if empty
      const section = document.getElementById('restaurant-section');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (onFilterChange) onFilterChange(searchVal.trim());
    const section = document.getElementById('restaurant-section');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-[95vh] flex items-center overflow-hidden bg-slate-950">
      
      {/* Immersive Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/hero_bg.png" 
          alt="Premium Kitchen" 
          className="w-full h-full object-cover opacity-40 scale-105 animate-slow-zoom"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
      </div>

      {/* Floating Sparkles/Particles (Subtle) */}
      <div className="absolute inset-0 z-1 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-1 h-1 bg-orange-400 rounded-full animate-ping opacity-30" />
        <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse opacity-20" />
        <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-40" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left Content */}
        <div className="animate-fade-up">
          {/* Premium Badge */}
          <div className="inline-flex items-center gap-3 px-5 py-2.5 mb-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-full shadow-2xl">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <span className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em]">The Premium Dining Network</span>
          </div>

          <h1 className="text-4xl md:text-8xl font-black text-white leading-[1.1] md:leading-[0.9] tracking-tighter mb-8">
            Elevate Your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-red-600">Palate</span><br />
            Every Day.
          </h1>

          <p className="text-slate-400 text-lg font-medium leading-relaxed mb-12 max-w-lg border-l-2 border-orange-500/30 pl-6">
            Discover curated kitchens and artisanal ingredients delivered with precision. 
            The elite food experience is now at your doorstep.
          </p>

          {/* Search Bar (Next Level Refresh) */}
          <div className="relative mb-8 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-[2.2rem] blur opacity-25 group-focus-within:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative">
              <input
                type="text"
                placeholder="Craving something specific?"
                value={searchVal}
                onChange={handleInputChange}
                onFocus={() => setShowResults(true)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 md:pl-16 pr-4 md:pr-48 py-5 md:py-6 rounded-2xl md:rounded-[2rem] bg-slate-900/80 backdrop-blur-xl border border-white/10 text-white placeholder:text-slate-500 font-bold outline-none focus:border-orange-500/50 transition-all text-base md:text-lg shadow-2xl"
              />

              {/* Live Search Results Overlay (Next Level) */}
              {showResults && (searchVal.trim() !== '') && (
                <div className="absolute top-full left-0 right-0 mt-6 bg-white/95 backdrop-blur-2xl rounded-3xl md:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white p-6 md:p-10 z-[100] animate-fade-up max-h-[70vh] overflow-y-auto scrollbar-none">
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                    <div>
                      <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400 mb-1">Results for</h4>
                      <p className="text-slate-900 font-black text-xl tracking-tight">"{searchVal}"</p>
                    </div>
                    <button onClick={() => setShowResults(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all">✕</button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-12">
                    {/* Restaurants Column */}
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h5 className="font-black text-xs uppercase tracking-widest text-orange-600 flex items-center gap-2">
                           Curated Kitchens
                        </h5>
                        <span className="text-[10px] font-black text-slate-300">{searchResults.restaurants.length} FOUND</span>
                      </div>
                      <div className="space-y-5">
                        {searchResults.restaurants.length > 0 ? (
                          searchResults.restaurants.map(r => (
                            <div
                              key={r._id}
                              onClick={() => navigate(`/restaurant/${r._id}`)}
                              className="group flex items-center gap-5 p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-100"
                            >
                              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shrink-0">
                                <img src={r.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-base leading-tight group-hover:text-orange-600 transition-colors">{r.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{r.cuisines?.slice(0, 2).join(' • ')}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                                    <Star size={10} className="fill-emerald-600" /> {r.rating || '4.5'}
                                  </div>
                                  <span className="text-[10px] font-black text-slate-400">• {r.deliveryTime || '25'} MIN</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : <p className="p-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 rounded-2xl">No matching kitchens</p>}
                      </div>
                    </div>

                    {/* Dishes Column */}
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h5 className="font-black text-xs uppercase tracking-widest text-red-600 flex items-center gap-2">
                           Top Rated Dishes
                        </h5>
                        <span className="text-[10px] font-black text-slate-300">{searchResults.items.length} FOUND</span>
                      </div>
                      <div className="space-y-5">
                        {searchResults.items.length > 0 ? (
                          searchResults.items.map(item => (
                            <div
                              key={item._id}
                              onClick={() => navigate(`/restaurant/${item.restaurant?._id || item.restaurant}`)}
                              className="group flex items-center gap-5 p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-slate-100"
                            >
                              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shrink-0">
                                <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-base leading-tight group-hover:text-red-600 transition-colors uppercase tracking-tight">{item.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate max-w-[150px]">From {item.restaurant?.name || 'Grand Kitchen'}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <p className="text-xs font-black text-slate-900">₹{item.price}</p>
                                  <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">Popular</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : <p className="p-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 rounded-2xl">No matching dishes</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleSearch}
                className="mt-4 md:mt-0 md:absolute md:right-3 md:top-3 md:bottom-3 w-full md:w-auto px-10 py-4 md:py-0 rounded-xl md:rounded-[1.4rem] bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-xs uppercase tracking-[0.2em] hover:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.5)] transition-all active:scale-[0.97] group"
              >
                Find Food <ChevronDown size={14} className="inline ml-1 group-hover:translate-y-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Featured Categories */}
          <div className="flex flex-wrap gap-2.5 mb-14">
            {CUISINE_TAGS.map((tag) => (
              <button
                key={tag.label}
                onClick={() => handleTagClick(tag)}
                className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTag === tag.label
                  ? 'bg-orange-500 text-white shadow-[0_15px_30px_-10px_rgba(249,115,22,0.4)] translate-y-[-2px]'
                  : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* Trust Signals / Awards */}
          <div className="flex items-center gap-10 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex flex-col">
              <span className="text-white font-black text-2xl tracking-tighter">1.2M+</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Happy Diners</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-white font-black text-2xl tracking-tighter">4.9/5</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">App Store</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
               <span className="text-white font-black text-2xl tracking-tighter">200+</span>
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Awards</span>
            </div>
          </div>
        </div>

        {/* Right: Premium Collage (Generated Images) */}
        <div className="relative hidden lg:flex items-center justify-center">
          {/* Main Card (Generated Sushi) */}
          <div className="relative w-96 h-[32rem] rounded-[4rem] overflow-hidden shadow-2xl border-[12px] border-slate-900/50 backdrop-blur-md animate-float lg:rotate-3 group">
            <img
              src="/sushi_card.png"
              alt="Premium Sushi"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-10 left-10 p-2">
              <p className="text-white font-black text-3xl tracking-tighter">Artisanal Sushi</p>
              <div className="flex items-center gap-2 mt-4">
                <span className="px-3 py-1 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">Best Seller</span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-lg">Chef Choice</span>
              </div>
            </div>
          </div>

          {/* Floating Card 2 (Generated Burger) */}
          <div className="absolute -top-12 -right-8 bg-white rounded-[3rem] p-6 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] border border-slate-100 w-64 animate-float delay-700 lg:-rotate-6">
            <div className="relative rounded-[2rem] overflow-hidden mb-5 aspect-[4/3]">
               <img src="/burger_card.png" alt="Smash Burger" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tight">The Signature<br/>Smash</p>
              <div className="flex items-center justify-between mt-4 pb-2">
                <p className="text-orange-600 font-black text-xl tracking-tighter">₹349</p>
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-black text-slate-700">4.9</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Delivery Node */}
          <div className="absolute top-1/2 -left-20 transform -translate-y-1/2 bg-slate-950/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl flex flex-col items-center gap-3 animate-pulse">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/30">
              <Truck size={24} />
            </div>
            <div className="text-center">
              <p className="text-white font-black text-sm tracking-tighter">LIVE ETA</p>
              <p className="text-orange-500 font-black text-2xl tracking-tighter">18 MIN</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Wave Divider or Scroll Hint */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 cursor-pointer group hover:bottom-8 transition-all duration-500" onClick={() => document.getElementById('restaurant-section').scrollIntoView({ behavior: 'smooth' })}>
        <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em] group-hover:text-orange-500 transition-colors">Explore Kitchens</span>
        <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center p-1">
           <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
};

export default Hero;