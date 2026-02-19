import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../context/cartStore';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, loading, getCart, updateCart, removeFromCart } = useCartStore();

  useEffect(() => {
    getCart();
  }, [getCart]);

  if (loading) return <div className="text-center py-20">Loading cart...</div>;

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const deliveryFee = cart?.deliveryFee || 5.00; // Fixed fee example
  const total = subtotal + deliveryFee;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black text-gray-900 border-l-8 border-[#ff4f00] pl-6 mb-10">Your Basket</h1>
        
        {items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.menuItemId} className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <p className="text-gray-500">€{item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => updateCart(item.menuItemId, item.quantity - 1)} className="w-8 h-8 rounded-full border">-</button>
                    <span className="font-bold">{item.quantity}</span>
                    <button onClick={() => updateCart(item.menuItemId, item.quantity + 1)} className="w-8 h-8 rounded-full border">+</button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm h-fit">
              <h3 className="text-xl font-bold mb-6">Order Summary</h3>
              <div className="space-y-4 border-b pb-6">
                <div className="flex justify-between"><span>Subtotal</span><span className="font-bold">€{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span className="font-bold">€{deliveryFee.toFixed(2)}</span></div>
              </div>
              <div className="flex justify-between py-6">
                <span className="text-xl font-bold">Total</span>
                <span className="text-2xl font-black text-[#ff4f00]">€{total.toFixed(2)}</span>
              </div>
              <button onClick={() => navigate('/checkout')} className="w-full bg-[#ff4f00] text-white py-4 rounded-xl font-bold hover:bg-[#e64600]">Checkout</button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-20 text-center shadow-sm">
            <h2 className="text-3xl font-black text-gray-800 mb-2">Your basket is empty</h2>
            <Link to="/" className="text-[#ff4f00] font-bold">Browse Restaurants</Link>
          </div>
        )}
      </div>
    </div>
  );
}