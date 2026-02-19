import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Search, MapPin } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export default function Header() {
  const items = useCartStore((state) => state.items);
  const count = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 h-20 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link to="/" className="text-2xl font-black text-slate-900 tracking-tighter">
          FOOD<span className="text-orange-600">COURT.</span>
        </Link>
        <div className="hidden lg:flex items-center gap-2 bg-slate-100/50 px-4 py-2 rounded-full border border-gray-100 text-xs font-bold text-slate-500">
          <MapPin size={14} className="text-orange-500" />
          Deliver to: <span className="text-slate-900">Current Location</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden md:flex relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search favorites..." 
            className="pl-10 pr-4 py-2 bg-slate-100 rounded-full text-sm outline-none w-40 focus:w-60 focus:bg-white focus:ring-2 focus:ring-orange-500/10 transition-all"
          />
        </div>
        
        <Link to="/cart" className="relative p-3 bg-white rounded-2xl border border-gray-100 hover:border-orange-200 transition-all shadow-sm">
          <ShoppingBag size={20} className="text-slate-700" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
              {count}
            </span>
          )}
        </Link>
        <button className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl font-bold text-sm hover:shadow-lg transition-all active:scale-95">
          Sign In
        </button>
      </div>
    </nav>
  );
}