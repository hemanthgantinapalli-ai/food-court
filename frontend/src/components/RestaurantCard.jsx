import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Bike, ChevronRight, MapPin } from 'lucide-react';

const IMAGE_FALLBACKS = [
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
  'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80',
];

export default function RestaurantCard({ restaurant, index = 0 }) {
  const imageSrc = restaurant.image || IMAGE_FALLBACKS[index % IMAGE_FALLBACKS.length];
  const rating = restaurant.rating || '4.5';
  const cuisines = restaurant.cuisines?.slice(0, 3) || ['Gourmet', 'Continental'];
  const deliveryTime = restaurant.deliveryTime || 30;
  const deliveryFee = restaurant.deliveryFee;
  const isFreeDelivery = !deliveryFee || deliveryFee === 0;

  return (
    <Link to={`/restaurant/${restaurant._id}`} className="group block">
      <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/60 hover:-translate-y-2 transition-all duration-500">

        {/* Image */}
        <div className="relative h-56 w-full overflow-hidden">
          <img
            src={imageSrc}
            alt={restaurant.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80'; }}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Rating badge */}
          <div className="absolute top-4 left-4">
            <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
              <Star size={13} className="fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-black text-slate-900">{rating}</span>
            </div>
          </div>

          {/* Free delivery badge */}
          {isFreeDelivery && (
            <div className="absolute top-4 right-4">
              <div className="bg-green-500 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm">
                Free Delivery
              </div>
            </div>
          )}

          {/* Hover CTA */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
            <div className="bg-orange-500 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">
              View Menu →
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-3">
            <h3 className="text-xl font-black text-slate-900 group-hover:text-orange-600 transition-colors tracking-tight mb-1">
              {restaurant.name}
            </h3>
            <p className="text-slate-400 text-sm font-medium flex items-center gap-1">
              {cuisines.join(' · ')}
            </p>
          </div>

          {/* Location if available */}
          {restaurant.location?.city && (
            <p className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-4">
              <MapPin size={12} className="text-orange-400" />
              {restaurant.location.city}
            </p>
          )}

          {/* Footer Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <Clock size={14} className="text-orange-500" />
                {deliveryTime} Min
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <Bike size={14} className="text-emerald-500" />
                {isFreeDelivery ? 'Free' : `₹${deliveryFee}`}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
              <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}