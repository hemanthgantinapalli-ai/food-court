import { Link } from 'react-router-dom';
import { Star, Clock, Bike, ArrowRight } from 'lucide-react';

export default function RestaurantCard({ restaurant }) {
  return (
    <Link to={`/restaurant/${restaurant._id}`} className="group block">
      <div className="premium-card">
        {/* FIXED ASPECT RATIO CONTAINER */}
        <div className="relative h-64 w-full overflow-hidden">
          <img 
            src={restaurant.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836'} 
            alt={restaurant.name}
            className="img-fixed-ratio group-hover:scale-110"
          />
          <div className="absolute top-4 left-4">
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
              <Star size={14} className="fill-orange-500 text-orange-500" />
              <span className="text-xs font-black">{restaurant.rating}</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
            {restaurant.name}
          </h3>
          <p className="text-slate-400 text-sm font-medium mt-1 truncate">
            {restaurant.cuisines?.join(' • ') || 'Premium Dining'}
          </p>
          
          <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <Clock size={14} className="text-orange-500" /> 25 min
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <Bike size={14} className="text-green-500" /> Free
              </span>
            </div>
            <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center group-hover:bg-orange-600 transition-all transform group-hover:translate-x-1">
              <ArrowRight size={18} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}// Ensure your path matches your route definition
<Link to={`/restaurant/${restaurant._id}`}>
  View Menu
</Link>