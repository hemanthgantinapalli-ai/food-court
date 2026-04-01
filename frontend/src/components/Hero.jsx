import React, { useState, useRef } from 'react';
import { Search, MapPin, Star, Clock, Truck, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAssetURL } from '../utils/imageHandler';

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
    const section = document.getElementById('restaurant-section');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearch = () => {
    if (!searchVal.trim()) {
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
      
      {/* Cinematic Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/chef_hero_bg.png" 
          alt="Cinematic Kitchen" 
          className="w-full h-full object-cover opacity-60 scale-105 animate-slow-zoom blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left Content: High-end Typography */}
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 mb-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-full">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <span className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em]">The Premium Dining Network</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-black text-white leading-[1.1] md:leading-[1] tracking-tighter mb-10" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Elevate Your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-red-600">Palate</span><br />
            Every Day.
          </h1>

          <p className="text-slate-300 text-lg md:text-xl font-medium leading-relaxed mb-12 max-w-lg border-l-3 border-orange-500 pl-8">
            Discover curated kitchens and artisanal ingredients delivered with precision. 
            The elite food experience is now at your doorstep.
          </p>

          <div className="relative mb-10 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-[2.2rem] blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
            <div className="relative">
              <input
                type="text"
                placeholder="Craving something specific?"
                value={searchVal}
                onChange={handleInputChange}
                onFocus={() => setShowResults(true)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 md:pl-16 pr-4 md:pr-48 py-6 rounded-2xl md:rounded-[2rem] bg-slate-900/90 backdrop-blur-2xl border border-white/10 text-white placeholder:text-slate-500 font-bold outline-none focus:border-orange-500/50 transition-all text-lg shadow-2xl"
              />
              
              <button
                onClick={handleSearch}
                className="mt-4 md:mt-0 md:absolute md:right-3 md:top-3 md:bottom-3 w-full md:w-auto px-12 py-4 md:py-0 rounded-xl md:rounded-[1.4rem] bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-xs uppercase tracking-[0.2em] hover:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.5)] transition-all active:scale-[0.97]"
              >
                Find Food <ChevronDown size={14} className="inline ml-1" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {CUISINE_TAGS.map((tag) => (
              <button
                key={tag.label}
                onClick={() => handleTagClick(tag)}
                className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTag === tag.label
                  ? 'bg-orange-500 text-white shadow-xl translate-y-[-2px]'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content: Cinematic Floating Elements (Visible on Mobile/Tablet too with smaller scale) */}
        <div className="relative flex items-center justify-center lg:pr-12 group">
          <div className="relative w-full max-w-[22rem] md:max-w-[26rem] lg:max-w-[30rem] aspect-[5/6] rounded-[3rem] md:rounded-[4rem] overflow-hidden shadow-2xl border-[10px] md:border-[16px] border-slate-900/80 backdrop-blur-md animate-float">
            <img
              src="/wagyu_burger_card.png"
              alt="Gourmet Wagyu Burger"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[4s]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 md:bottom-12 md:left-12 md:right-12">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <div className="flex items-center gap-1.5 bg-orange-600 px-2.5 py-1 rounded-full">
                  <Star size={12} className="fill-white text-white" />
                  <span className="text-xs font-black text-white">4.9</span>
                </div>
                <span className="px-2.5 py-1 bg-white/10 backdrop-blur-md text-white/90 text-[10px] font-black uppercase tracking-widest rounded-full border border-white/10">Signature</span>
              </div>
              <p className="text-white font-black text-3xl md:text-4xl tracking-tighter leading-none mb-1 md:mb-2 italic">The Wagyu Signature</p>
              <p className="text-orange-400 font-black text-xl md:text-2xl tracking-tighter">₹549</p>
            </div>
          </div>

          <div className="absolute -bottom-6 -right-2 md:-bottom-10 md:-right-10 bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl animate-fade-up delay-300">
             <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                   <Truck size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                   <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live Delivery</p>
                   <p className="text-white font-black text-lg md:text-2xl tracking-tighter">18 MIN</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 cursor-pointer group" onClick={() => document.getElementById('restaurant-section').scrollIntoView({ behavior: 'smooth' })}>
        <span className="text-white/30 text-[10px] font-black uppercase tracking-[0.6em] group-hover:text-orange-400 transition-colors">Experience Excellence</span>
        <div className="w-1 h-12 bg-gradient-to-b from-orange-500 to-transparent rounded-full animate-bounce" />
      </div>
    </div>
  );
};

export default Hero;