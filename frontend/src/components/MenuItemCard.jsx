import React from 'react';
import { Plus, Minus, Heart } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

const FOOD_FALLBACKS = [
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400&q=80',
  'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&q=80',
];

export default function MenuItemCard({ item }) {
  const { items, addToCart, removeFromCart } = useCartStore();
  const cartItem = items.find(i => i._id === item._id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const foodImg = item.image || FOOD_FALLBACKS[Math.abs(item._id?.charCodeAt(0) || 0) % FOOD_FALLBACKS.length];

  return (
    <div className="group bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-5 hover:shadow-xl hover:shadow-orange-50 hover:border-orange-100 transition-all duration-400">

      {/* Image */}
      <div className="relative w-36 h-36 rounded-2xl overflow-hidden shrink-0 shadow-md">
        <img
          src={foodImg}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }}
        />
        {item.isVeg !== undefined && (
          <div className={`absolute bottom-2 right-2 w-4 h-4 rounded-sm border-2 flex items-center justify-center ${item.isVeg ? 'border-green-500 bg-green-500' : 'border-red-500 bg-red-500'}`}>
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Category tag */}
        {item.category && (
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1 block">{item.category}</span>
        )}

        <div className="flex justify-between items-start mb-1">
          <h4 className="font-black text-slate-900 text-lg tracking-tight leading-tight">{item.name}</h4>
          <span className="text-orange-600 font-black text-xl shrink-0 ml-3">
            ₹{item.price}
          </span>
        </div>

        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed mb-5 font-medium">
          {item.description || 'Chef\'s hand-crafted selection made with fresh, locally sourced ingredients.'}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          {/* Wishlist */}
          <button className="flex items-center gap-1.5 text-slate-300 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-wider">
            <Heart size={14} className={quantity > 0 ? 'fill-red-400 text-red-400' : ''} />
            {quantity > 0 ? 'Saved' : 'Save'}
          </button>

          {/* Add to Cart */}
          {quantity === 0 ? (
            <button
              onClick={() => addToCart(item)}
              className="bg-slate-900 hover:bg-orange-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-orange-200 active:scale-95"
            >
              + Add
            </button>
          ) : (
            <div className="flex items-center gap-4 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg">
              <button
                onClick={() => removeFromCart(item._id)}
                className="hover:text-orange-400 transition-colors"
              >
                <Minus size={16} strokeWidth={3} />
              </button>
              <span className="font-black text-base w-5 text-center">{quantity}</span>
              <button
                onClick={() => addToCart(item)}
                className="hover:text-orange-400 transition-colors"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}