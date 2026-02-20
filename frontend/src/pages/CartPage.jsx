import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Trash2, Plus, Minus, Tag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export default function CartPage() {
  const navigate = useNavigate();
  // Use the local Zustand store (not the API-based one)
  const { items, addToCart, removeFromCart, getTotal, applyCoupon, coupon, discount } = useCartStore();

  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState('');

  const subtotal = getTotal();
  const deliveryFee = subtotal > 0 ? 49 : 0;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + deliveryFee + tax - (discount || 0);

  const handleApplyCoupon = () => {
    const result = applyCoupon(couponCode.trim());
    setCouponMessage(result.message);
    if (result.success) {
      setCouponCode('');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] py-12 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-orange-600 transition-colors font-bold text-sm mb-8"
        >
          <ArrowLeft size={16} /> Back to Restaurants
        </Link>

        <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-10">
          Your <span className="text-orange-500">Basket.</span>
        </h1>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

            {/* Items List */}
            <div className="lg:col-span-7 space-y-4">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl p-5 flex gap-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                >
                  {/* Image */}
                  <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80'; }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-black text-slate-900 text-lg">{item.name}</h3>
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="text-slate-300 hover:text-red-400 transition-colors ml-3"
                        title="Remove from cart"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity */}
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-1 rounded-xl">
                        <button
                          onClick={() => {
                            if (item.quantity === 1) removeFromCart(item._id);
                            else addToCart({ ...item, price: item.price, quantity: item.quantity - 2 }); // decrease by triggering a re-add isn't ideal, better:
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-orange-50 hover:text-orange-600 transition-all"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-black text-sm w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:bg-orange-50 hover:text-orange-600 transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Price */}
                      <span className="font-black text-slate-900 text-lg">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Coupon Section */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <Tag className="text-orange-500 shrink-0" size={20} />
                  <input
                    type="text"
                    placeholder="Enter coupon code (e.g. FOODCOURT10)"
                    className="flex-1 bg-transparent outline-none font-medium text-slate-700 placeholder:text-slate-300"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {couponMessage && (
                  <p className={`mt-3 text-sm font-bold ${couponMessage.includes('applied') ? 'text-green-500' : 'text-red-500'}`}>
                    {couponMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-5">
              <div className="bg-slate-950 text-white p-8 rounded-3xl shadow-2xl shadow-orange-100/30 sticky top-28">
                <h3 className="text-xl font-black mb-8 tracking-tight">Order Summary</h3>

                <div className="space-y-4 border-b border-white/10 pb-6 mb-6">
                  {items.map((item) => (
                    <div key={item._id} className="flex justify-between text-slate-400 text-sm">
                      <span className="font-medium">{item.name} × {item.quantity}</span>
                      <span className="font-bold text-white">₹{(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-b border-white/10 pb-6 mb-6">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold text-sm uppercase tracking-wider">Subtotal</span>
                    <span className="text-white font-black">₹{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold text-sm uppercase tracking-wider">Delivery</span>
                    <span className="text-white font-black">₹{deliveryFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold text-sm uppercase tracking-wider">Taxes (5%)</span>
                    <span className="text-white font-black">₹{tax}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-emerald-400 font-bold text-sm uppercase tracking-wider">Discount ({coupon})</span>
                      <span className="text-emerald-400 font-black">-₹{discount.toFixed(0)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-end mb-8">
                  <span className="text-slate-400 font-black uppercase text-xs tracking-widest">Total</span>
                  <span className="text-4xl font-black text-orange-400 tracking-tighter">₹{total.toFixed(0)}</span>
                </div>

                <button
                  onClick={() => navigate('/checkout')}
                  id="checkout-btn"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-[0.98]"
                >
                  Proceed to Checkout →
                </button>

                <p className="text-center text-slate-600 text-xs mt-4 font-medium">
                  🔒 Secure & encrypted checkout
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-28 bg-white rounded-3xl border-2 border-dashed border-slate-200 max-w-lg mx-auto">
            <ShoppingBag size={72} className="mx-auto text-slate-200 mb-6" />
            <h2 className="text-3xl font-black text-slate-900 mb-3">Your basket is empty</h2>
            <p className="text-slate-400 font-medium mb-8">Add some delicious items to get started</p>
            <Link
              to="/"
              className="inline-block bg-gradient-to-r from-orange-500 to-red-500 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:opacity-90 transition-all"
            >
              Browse Restaurants
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}