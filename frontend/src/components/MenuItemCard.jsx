import React from 'react';
import { Plus, Info } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export default function MenuItemCard({ item }) {
  const addToCart = useCartStore((state) => state.addToCart);

  return (
    <div className="bg-white p-4 rounded-3xl border border-slate-100 flex gap-5 hover:border-orange-200 transition-all group">
      {/* FORCED SQUARE IMAGE */}
      <div className="relative w-28 h-28 rounded-2xl overflow-hidden shrink-0 bg-slate-50">
        <img 
          src={item.image} 
          alt={item.name}
          className="img-fixed-ratio group-hover:scale-105" 
        />
      </div>
      
      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
        <div>
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-slate-800 text-lg truncate pr-2">{item.name}</h4>
            <span className="text-orange-600 font-black tracking-tighter">${item.price}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed italic">
            {item.description || "Prepared with fresh, seasonal ingredients."}
          </p>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <button className="text-slate-300 hover:text-slate-600 transition-colors">
            <Info size={16} />
          </button>
          <button 
            onClick={() => addToCart(item)}
            className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-orange-600 transition-all transform active:scale-90 shadow-sm"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}