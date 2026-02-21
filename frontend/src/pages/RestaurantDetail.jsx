import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Clock, Bike, MapPin, Heart, ArrowLeft, Phone, Users, Copy, Check, X } from 'lucide-react';
import API from '../api/axios';
import MenuItemCard from '../components/MenuItemCard';

// Fallback menu items for demo
const DEMO_MENU = [
  { _id: 'm1', name: 'Signature Smash Burger', price: 349, description: 'Double smash patty with aged cheddar, caramelized onions, and our secret sauce on a brioche bun.', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80', category: 'Mains' },
  { _id: 'm2', name: 'Crispy Chicken Wings', price: 249, description: 'Marinated overnight, tossed in buffalo or honey-garlic sauce. Served with blue cheese dip.', image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&q=80', category: 'Starters' },
  { _id: 'm3', name: 'Truffle Mac & Cheese', price: 279, description: 'Rich creamy béchamel, gruyère & sharp cheddar blend, topped with shaved black truffle.', image: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400&q=80', category: 'Mains' },
  { _id: 'm4', name: 'Caesar Salad', price: 199, description: 'Crisp romaine, house-made dressing, parmesan shavings, and house-baked croutons.', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80', category: 'Starters' },
  { _id: 'm5', name: 'Molten Lava Cake', price: 159, description: 'Warm dark chocolate cake with a molten center. Served with vanilla bean ice cream.', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80', category: 'Desserts' },
];

export default function RestaurantDetail() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isFavorited, setIsFavorited] = useState(false);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const groupLink = `https://foodcourt.app/group/${id || 'FC'}19X8`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(groupLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await API.get(`/restaurants/${id}`);
        const payload = res.data.data;
        setRestaurant(payload.restaurant || payload);
        setMenu(payload.menu?.length ? payload.menu : DEMO_MENU);
      } catch (error) {
        console.warn('Using demo data:', error.message);
        setRestaurant({
          name: 'The Smoke House',
          image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80',
          rating: 4.8,
          cuisines: ['American', 'Burgers', 'BBQ'],
          deliveryTime: 25,
          deliveryFee: 0,
          location: { address: '42 Gourmet Street', city: 'Mumbai' },
          description: 'Award-winning burgers and BBQ crafted with locally sourced premium ingredients.',
        });
        setMenu(DEMO_MENU);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-black uppercase tracking-widest text-slate-400 text-sm">Preparing Menu...</p>
      </div>
    </div>
  );

  const categories = ['All', ...new Set(menu.map(item => item.category).filter(Boolean))];
  const filteredMenu = activeCategory === 'All' ? menu : menu.filter(i => i.category === activeCategory);

  return (
    <div className="bg-white min-h-screen pb-20">

      {/* Hero Image */}
      <div className="relative h-[55vh] w-full overflow-hidden">
        <img
          src={restaurant.image || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&q=80'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Back button */}
        <Link
          to="/"
          className="absolute top-6 left-6 flex items-center gap-2 bg-black/40 backdrop-blur-sm text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-black/60 transition-all"
        >
          <ArrowLeft size={16} /> Back
        </Link>

        {/* Favorite button */}
        <button
          onClick={() => setIsFavorited(!isFavorited)}
          className="absolute top-6 right-6 w-11 h-11 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl hover:bg-black/60 transition-all"
        >
          <Heart
            size={20}
            className={isFavorited ? 'fill-red-500 text-red-500' : 'text-white'}
          />
        </button>

        {/* Restaurant Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-8 pb-10 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Star size={13} className="fill-white" /> {restaurant.rating}
            </div>
            {restaurant.cuisines?.map(c => (
              <span key={c} className="bg-white/20 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full text-xs font-bold border border-white/20">
                {c}
              </span>
            ))}
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none mb-2">
            {restaurant.name}
          </h1>
          {restaurant.description && (
            <p className="text-white/70 font-medium max-w-xl mt-3">{restaurant.description}</p>
          )}
        </div>
      </div>

      {/* Info Strip */}
      <div className="bg-slate-950 py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-6 items-center justify-between">
          <div className="flex gap-6">
            <span className="flex items-center gap-2 text-white/70 text-sm font-bold">
              <Clock size={16} className="text-orange-400" />
              {restaurant.deliveryTime || 30} min delivery
            </span>
            <span className="flex items-center gap-2 text-white/70 text-sm font-bold">
              <Bike size={16} className="text-green-400" />
              {restaurant.deliveryFee > 0 ? `₹${restaurant.deliveryFee} delivery fee` : 'Free delivery'}
            </span>
            {restaurant.location && (
              <span className="flex items-center gap-2 text-white/70 text-sm font-bold">
                <MapPin size={16} className="text-blue-400" />
                {restaurant.location.address}, {restaurant.location.city}
              </span>
            )}
          </div>
          <button className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors">
            <Phone size={14} /> Call Restaurant
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 mt-12">

        {/* Category Tabs */}
        {categories.length > 1 && (
          <div className="flex gap-3 mb-10 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeCategory === cat
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Menu Items */}
          <div className="lg:col-span-8">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                {activeCategory === 'All' ? "Today's" : activeCategory}{' '}
                <span className="text-orange-500">{activeCategory === 'All' ? 'Menu' : 'Items'}</span>
              </h2>
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-slate-400 font-bold text-sm">{filteredMenu.length} items</span>
            </div>

            <div className="space-y-5">
              {filteredMenu.map(item => (
                <MenuItemCard key={item._id} item={item} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-3xl shadow-2xl">
              <h4 className="font-black text-lg mb-6">Order Details</h4>

              <div className="space-y-4 mb-6 pb-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                    <Clock size={16} className="text-orange-400" /> Delivery Time
                  </span>
                  <span className="font-black text-white">{restaurant.deliveryTime || 30} MIN</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                    <Bike size={16} className="text-green-400" /> Delivery Fee
                  </span>
                  <span className="font-black text-white">
                    {restaurant.deliveryFee > 0 ? `₹${restaurant.deliveryFee}` : 'FREE'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                    <Star size={16} className="text-yellow-400" /> Rating
                  </span>
                  <span className="font-black text-white">{restaurant.rating} / 5.0</span>
                </div>
              </div>

              {restaurant.location && (
                <div className="mb-6">
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Location</p>
                  <p className="text-sm font-bold text-white flex gap-2">
                    <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                    {restaurant.location.address}, {restaurant.location.city}
                  </p>
                </div>
              )}

              <button
                onClick={() => setShowGroupModal(true)}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
              >
                <Users size={18} /> Group Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Group Order Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-fade-up">
            <button
              onClick={() => setShowGroupModal(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Users size={32} className="text-orange-500" />
            </div>

            <h3 className="text-2xl font-black text-slate-900 text-center mb-2">Start a Group Order</h3>
            <p className="text-slate-500 text-sm text-center font-medium mb-8">
              Share this link with your friends. They can vote and add items directly to your cart!
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3 mb-6">
              <input
                type="text"
                readOnly
                value={groupLink}
                className="bg-transparent flex-1 text-slate-700 font-bold text-sm outline-none w-full"
              />
              <button
                onClick={handleCopyLink}
                className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-orange-500 transition-colors shrink-0"
              >
                {copiedLink ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>

            <button
              onClick={() => setShowGroupModal(false)}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-500 transition-colors shadow-xl"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}