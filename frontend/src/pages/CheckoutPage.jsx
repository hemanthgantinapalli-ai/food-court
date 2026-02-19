import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useCartStore } from '../context/cartStore';
import { useAuthStore } from '../context/authStore';
import Toast from '../components/Toast';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const handlePlaceOrder = async () => {
    try {
      setLoading(true);
      const response = await API.post('/orders', {
        address: user?.addresses?.[0],
        items: cart.items,
        total: cart.total
      });
      clearCart();
      navigate(`/payment-success?orderId=${response.data.data._id}`);
    } catch (error) {
      setToast({ message: 'Order failed. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-black mb-8">Secure Checkout</h1>
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
        <h2 className="font-bold mb-4">Delivery Address</h2>
        <p className="text-gray-600">{user?.addresses?.[0]?.street || 'No address provided'}</p>
      </div>
      <button 
        onClick={handlePlaceOrder}
        disabled={loading || !cart?.items?.length}
        className="w-full bg-primary text-white py-4 rounded-xl font-black text-lg disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Place Order'}
      </button>
      {toast.message && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: '' })} />}
    </div>
  );
}