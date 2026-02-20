import React from 'react';
import { ShoppingCart, User, Search, MapPin } from 'lucide-react';

const Navbar = () => (
  <nav className="flex items-center justify-between px-6 md:px-12 py-5 bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-100/50">
    
    {/* Left: Brand & Location */}
    <div className="flex items-center gap-8">
      <div className="text-2xl font-black tracking-tighter flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-tr from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-xs">FC</span>
        </div>
        <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Food<span className="text-orange-500">Court</span>
        </span>
      </div>

      {/* Modern Location Picker (Subtle) */}
      <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
        <MapPin size={14} className="text-orange-500" />
        <span className="text-xs font-bold text-slate-600">Home, Sector 62...</span>
      </div>
    </div>

    {/* Center: Links with active state indicators */}
    <div className="hidden md:flex items-center gap-10">
      {['Restaurants', 'Groceries', 'Offers'].map((item) => (
        <a 
          key={item}
          href={`#${item.toLowerCase()}`} 
          className="relative text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors group"
        >
          {item}
          <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all group-hover:w-full" />
        </a>
      ))}
    </div>

    {/* Right: Actions */}
    <div className="flex items-center gap-2 md:gap-4">
      
      {/* Search Input (Integrated style) */}
      <div className="hidden sm:flex items-center bg-slate-100 rounded-xl px-3 py-2 gap-2 border border-transparent focus-within:border-orange-200 focus-within:bg-white transition-all">
        <Search size={16} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Search food..." 
          className="bg-transparent border-none outline-none text-sm font-medium w-24 lg:w-40"
        />
      </div>

      <div className="flex items-center gap-1">
        <button className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors relative">
          <ShoppingCart size={20} />
          <span className="absolute top-1.5 right-1.5 bg-orange-600 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
            3
          </span>
        </button>

        <button className="flex items-center gap-2 p-1.5 pr-4 hover:bg-slate-50 rounded-xl text-slate-700 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
            <User size={18} className="text-slate-500" />
          </div>
          <span className="text-sm font-bold hidden md:block">Login</span>
        </button>
      </div>
    </div>
  </nav>
);

export default Navbar;