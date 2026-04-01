import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Bike, ChevronRight, MapPin, Flame } from 'lucide-react';
import { getAssetURL } from '../utils/imageHandler';

const IMAGE_FALLBACKS = [
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
  'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80',
];

export default function RestaurantCard({ restaurant, index = 0 }) {
  const imageSrc = getAssetURL(restaurant.image) || IMAGE_FALLBACKS[index % IMAGE_FALLBACKS.length];
  const rating = restaurant.rating || '4.5';
  const cuisines = restaurant.cuisines?.slice(0, 3) || ['Gourmet', 'Continental'];
  const deliveryTime = restaurant.deliveryTime || 30;
  const deliveryFee = restaurant.deliveryFee;
  const isFreeDelivery = !deliveryFee || deliveryFee === 0;

  return (
    <Link to={`/restaurant/${restaurant._id}`} className="group block h-full">
      <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100/80 shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] hover:-translate-y-2.5 transition-all duration-700 h-full flex flex-col relative group/card">
        
        {/* Elite/Luxury Badge */}
        {parseFloat(rating) >= 4.8 && (
          <div className="absolute top-6 -left-2 z-20 bg-slate-950 text-white px-4 py-1.5 rounded-r-lg font-black text-[9px] uppercase tracking-[0.3em] shadow-2xl flex items-center gap-2 border-l-4 border-orange-500">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
            Elite Kitchen
          </div>
        )}

        {/* Image Section */}
        <div className="relative h-48 md:h-60 w-full overflow-hidden">
          <img
            src={imageSrc}
            alt={restaurant.name}
            className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110 ease-out"
            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80'; }}
          />
          
          {/* Glass Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          {/* Floating Badges */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between translate-y-4 group-hover:translate-y-0 transition-all duration-700 opacity-0 group-hover:opacity-100">
             <div className="flex flex-col gap-1">
                <p className="text-white/60 text-[8px] font-black uppercase tracking-widest">Starting from</p>
                <p className="text-white font-black text-xl tracking-tighter">₹{restaurant.averagePrice || 500}</p>
             </div>
             <div className="bg-orange-500 text-white h-12 w-12 rounded-2xl flex items-center justify-center shadow-2xl border border-white/20 transform hover:rotate-12 transition-transform cursor-pointer">
                <ChevronRight size={20} />
             </div>
          </div>

          <div className="absolute top-6 right-6 flex flex-col gap-2 scale-90 group-hover:scale-100 transition-transform duration-700">
            <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl flex items-center gap-2 shadow-2xl border border-white/20">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-black text-slate-950 tracking-tight">{rating}</span>
            </div>
            {isFreeDelivery && (
              <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] shadow-xl text-center">
                Free Delivery
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 md:p-8 flex flex-col flex-1">
          <div className="flex-1 mb-6">
            <div className="flex items-center gap-2 mb-2">
               {parseFloat(rating) >= 4.7 && (
                 <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
               )}
               <h3 className="text-xl md:text-2xl font-black text-slate-950 group-hover:text-orange-600 transition-colors tracking-tighter leading-tight">
                {restaurant.name}
              </h3>
            </div>
            
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-80 mb-4">
              {cuisines.slice(0, 2).join(' • ')} 
              {cuisines.length > 2 && <span className="text-slate-300">+{cuisines.length - 2} More</span>}
            </p>

            {restaurant.location?.city && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100/50 group-hover:bg-orange-50 group-hover:border-orange-100 transition-colors">
                <MapPin size={12} className="text-orange-500" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{restaurant.location.city}</span>
              </div>
            )}
          </div>

          {/* Performance Stats Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-auto">
            <div className="flex items-center gap-6">
               <div className="flex flex-col">
                  <div className="flex items-center gap-1 md:gap-1.5 text-slate-950">
                    <Clock size={12} className="text-orange-500" />
                    <span className="text-[10px] md:text-xs font-black tracking-tight">{deliveryTime} MIN</span>
                  </div>
                  <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Delivery</span>
               </div>

               <div className="w-px h-6 bg-slate-100" />

               <div className="flex flex-col">
                  <div className="flex items-center gap-1 md:gap-1.5 text-slate-950">
                    <Bike size={12} className="text-emerald-500" />
                    <span className="text-[10px] md:text-xs font-black tracking-tight">{isFreeDelivery ? 'FREE' : `₹${deliveryFee}`}</span>
                  </div>
                  <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Fees</span>
               </div>
            </div>

            <div className="flex items-center gap-1.5 bg-yellow-50 px-2 py-1 rounded-lg">
               <Star size={10} className="fill-yellow-500 text-yellow-500" />
               <span className="text-[10px] font-black text-yellow-700">POPULAR</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}