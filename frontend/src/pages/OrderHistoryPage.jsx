import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle, MapPin, Receipt, ArrowRight, ChevronRight, CreditCard, Smartphone, Banknote, Map, Star, X, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import { useOrderStore } from '../store/orderStore';
import { useCartStore } from '../store/cartStore';

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useAuthStore();
  const { orders, fetchOrders, rateOrder } = useOrderStore();
  const { clearCart, addToCart } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleOrderAgain = (order) => {
    if (!order.items?.length) return;
    setReorderingId(order._id);
    clearCart();
    const restaurantRef = order.restaurant?._id || order.restaurant;
    order.items.forEach(item => {
      addToCart({
        _id: item.menuItem?._id || item.menuItem || item._id,
        name: item.name,
        price: item.price,
        image: item.menuItem?.image || item.image || '',
        restaurant: restaurantRef,
        quantity: 1,
      });
    });
    showToast('🛒 Items added to cart! Redirecting…', 'success');
    setTimeout(() => { setReorderingId(null); navigate('/checkout'); }, 1200);
  };

  // Rating Modal State
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedOrderForRating, setSelectedOrderForRating] = useState(null);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingReview, setRatingReview] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const handleOpenRatingModal = (order) => {
    setSelectedOrderForRating(order);
    setRatingModalOpen(true);
    setRatingScore(0);
    setRatingReview('');
  };

  const submitRating = async () => {
    if (ratingScore === 0) return alert('Please select a star rating first.');
    setIsSubmittingRating(true);
    try {
      await rateOrder(selectedOrderForRating._id || selectedOrderForRating.id, ratingScore, ratingReview);
      setRatingModalOpen(false);
    } catch (error) {
      alert(error.message || 'Failed to submit rating');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      await fetchOrders();
      setLoading(false);
    };
    if (user) {
      loadOrders();
    }
  }, [user, fetchOrders]);

  const filteredOrders = orders.filter(o => {

    const rawStatus = o.status || o.orderStatus || '';
    const status = rawStatus.toLowerCase();
    if (activeTab === 'ongoing') {
      return status !== 'delivered' && status !== 'cancelled' && status !== '';
    }
    if (activeTab === 'past') {
      return status === 'delivered' || status === 'cancelled';
    }
    return true;
  });

  const getStatusColor = (rawStatus) => {
    const status = (rawStatus || '').toLowerCase();
    if (status === 'out for delivery' || status === 'picked_up') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (status === 'preparing' || status === 'processing' || status === 'placed') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (status === 'delivered') return 'text-green-600 bg-green-50 border-green-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const getPaymentIcon = (type) => {
    if (type === 'upi') return <Smartphone size={16} className="text-orange-500" />;
    if (type === 'card') return <CreditCard size={16} className="text-orange-500" />;
    return <Banknote size={16} className="text-orange-500" />;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] py-12 px-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-4 rounded-2xl shadow-2xl font-black text-sm text-white transition-all animate-in slide-in-from-right-4 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-slate-900'
        }`}>
          {toast.msg}
        </div>
      )}
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <Link to="/profile" className="inline-flex items-center gap-2 text-slate-400 hover:text-orange-600 transition-colors font-bold text-sm mb-6">
            <ArrowRight size={16} className="rotate-180" /> Back to Profile
          </Link>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            My <span className="text-orange-500">Orders.</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2">View your order details, tracking status, and payment receipts.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {['all', 'ongoing', 'past'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-full font-bold text-sm capitalize whitespace-nowrap transition-all border-2
                ${activeTab === tab ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              {tab} Orders
            </button>
          ))}
        </div>

        {/* Order List */}
        <div className="space-y-6">
          {filteredOrders.length > 0 ? filteredOrders.map((order) => (
            <div key={order._id || order.id || Math.random()} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">

              {/* Order Header */}
              <div className="flex flex-wrap flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100 shrink-0">
                    <Receipt size={24} className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{order.orderId || order._id}</h3>
                    <p className="text-sm text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                      <Clock size={14} /> {order.createdAt ? new Date(order.createdAt).toLocaleString() : order.date}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-center sm:text-right">
                  {order.eta && (
                    <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm">
                      <Map size={14} className="text-orange-400" /> ETA: {order.eta}
                    </div>
                  )}
                  <div className={`px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-widest border ${getStatusColor(order.status || order.orderStatus)}`}>
                    {order.status || order.orderStatus || 'Pending'}
                  </div>
                </div>
              </div>

              {/* Order Details (Main Block) */}
              <div className="py-6 grid grid-cols-1 md:grid-cols-12 gap-8">

                {/* Items */}
                <div className="md:col-span-6 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Items Ordered</h4>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-center">
                      <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                        <img src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&q=60'} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                        <p className="text-slate-400 font-medium text-xs">Qty: {item.quantity || item.qty}</p>
                      </div>
                      <p className="font-black text-slate-900">₹{(item.price * (item.quantity || item.qty)).toFixed(0)}</p>
                    </div>
                  ))}
                </div>

                {/* Info (Payment & Address) */}
                <div className="md:col-span-6 space-y-5 border-t md:border-t-0 md:border-l border-slate-100 md:pl-8 pt-5 md:pt-0">

                  {/* Total & Payment */}
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Payment Info</h4>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-200 border-dashed">
                        <span className="text-slate-500 font-bold text-sm">Order Total</span>
                        <span className="text-xl font-black text-orange-500 tracking-tight">₹{order.total}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {order.paymentMethod?.type ? getPaymentIcon(order.paymentMethod.type) : getPaymentIcon(order.paymentMethod)}
                        <span className="text-slate-700 font-bold capitalize">{order.paymentMethod?.label || order.paymentMethod}</span>
                        <span className="ml-auto text-green-600 bg-green-100 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">Paid</span>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Delivered To</h4>
                    <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <MapPin size={16} className="text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-slate-600 leading-relaxed">
                        {order.deliveryAddress ? `${order.deliveryAddress.street}, ${order.deliveryAddress.area}, ${order.deliveryAddress.city}` : order.address}
                      </p>
                    </div>
                  </div>

                </div>

              </div>

              {/* Actions Footer */}
              <div className="pt-5 border-t border-slate-100 flex gap-3 sm:justify-end flex-wrap">
                {(order.status || order.orderStatus)?.toLowerCase() !== 'delivered' && (
                  <Link
                    to={`/track-order?orderId=${order.orderId || order._id}`}
                    className="flex-1 sm:flex-none justify-center bg-orange-500 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 flex items-center gap-2"
                  >
                    Track Order <Map size={16} />
                  </Link>
                )}
                {(order.status || order.orderStatus)?.toLowerCase() === 'delivered' && !order.rating?.score && (
                  <button
                    onClick={() => handleOpenRatingModal(order)}
                    className="flex-1 sm:flex-none justify-center bg-yellow-400 text-yellow-900 px-6 py-2.5 rounded-xl font-black text-sm hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-200 flex items-center gap-2"
                  >
                    <Star size={16} className="fill-current" /> Rate Order
                  </button>
                )}
                {(order.status || order.orderStatus)?.toLowerCase() === 'delivered' && order.rating?.score && (
                  <div className="flex-1 sm:flex-none justify-center px-6 py-2.5 rounded-xl font-black text-sm text-yellow-600 bg-yellow-50 flex items-center gap-2 border border-yellow-200">
                    <Star size={16} className="fill-current" /> Rated {order.rating.score}/5
                  </div>
                )}
                {['delivered', 'cancelled'].includes((order.status || order.orderStatus)?.toLowerCase()) && (
                  <button
                    onClick={() => handleOrderAgain(order)}
                    disabled={reorderingId === order._id}
                    className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-emerald-600 transition-colors shadow-lg disabled:opacity-60"
                  >
                    <RotateCcw size={15} className={reorderingId === order._id ? 'animate-spin' : ''} />
                    {reorderingId === order._id ? 'Adding…' : 'Order Again'}
                  </button>
                )}
                <button className="flex-1 sm:flex-none justify-center px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-2">
                  <Receipt size={16} /> Invoice
                </button>
              </div>

            </div>
          )) : (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Package size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-black text-slate-900 mb-2">No orders found</h3>
              <p className="text-slate-500 font-medium mb-6">Looks like you haven't placed an order yet.</p>
              <Link to="/" className="inline-block bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-orange-500 transition-colors shadow-lg">
                Browse Restaurants
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* Rating Modal */}
      {ratingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setRatingModalOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="mb-8">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center text-yellow-500 mb-6 mx-auto">
                <Star size={32} className="fill-current" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 text-center tracking-tight">Rate your order</h3>
              <p className="text-slate-500 font-medium text-center mt-2 leading-relaxed text-sm">
                How was your food from <span className="text-slate-900 font-bold">{selectedOrderForRating?.restaurant?.name || 'the restaurant'}</span>?
              </p>
            </div>
            <div className="flex justify-center gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingScore(star)}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${
                    ratingScore >= star
                      ? 'bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-200/50 scale-110'
                      : 'bg-slate-50 text-slate-300 hover:bg-slate-100 hover:scale-105'
                  }`}
                >
                  <Star size={24} className={ratingScore >= star ? "fill-current" : ""} />
                </button>
              ))}
            </div>
            <div className="mb-8">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Leave a Review (Optional)</label>
              <textarea
                value={ratingReview}
                onChange={(e) => setRatingReview(e.target.value)}
                placeholder="What did you like or dislike?"
                className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium text-slate-700 focus:outline-none focus:border-yellow-400 focus:bg-white transition-all resize-none"
              />
            </div>
            <button
              onClick={submitRating}
              disabled={isSubmittingRating || ratingScore === 0}
              className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                isSubmittingRating || ratingScore === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-yellow-400 text-yellow-900 shadow-xl shadow-yellow-200 hover:bg-yellow-500 hover:-translate-y-0.5'
              }`}
            >
              {isSubmittingRating ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}