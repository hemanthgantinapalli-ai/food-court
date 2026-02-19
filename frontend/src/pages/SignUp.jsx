import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/authStore.js';

export default function SignUp() {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    signUp(formData)
      .then(() => {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          navigate('/');
        }, 1500);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Failed to create account';
        alert(msg);
      });
  };

  const signUp = useAuthStore((s) => s.signUp);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12 bg-gray-50 relative">
      
      {/* --- SUCCESS TOAST --- */}
      {showSuccess && (
        <div className="fixed top-24 right-5 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] animate-bounce flex items-center space-x-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold">Account Created!</p>
            <p className="text-xs opacity-90">Redirecting you to the feast...</p>
          </div>
        </div>
      )}

      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-900">Create Account</h2>
          <p className="text-gray-500 mt-2">Join the FoodCourt community today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
            <input 
              name="name"
              type="text" 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#ff4f00] focus:ring-2 focus:ring-orange-100 outline-none transition"
              placeholder="John Doe"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
            <input 
              name="email"
              type="email" 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#ff4f00] focus:ring-2 focus:ring-orange-100 outline-none transition"
              placeholder="name@example.com"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <input 
              name="password"
              type="password" 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#ff4f00] focus:ring-2 focus:ring-orange-100 outline-none transition"
              placeholder="••••••••"
              onChange={handleChange}
              required
            />
          </div>

          <button className="w-full bg-[#ff4f00] text-white py-4 rounded-xl font-black text-lg hover:bg-[#e64600] transform active:scale-[0.98] transition shadow-lg shadow-orange-200 mt-4">
            Create Account
          </button>
        </form>

        <p className="mt-8 text-center text-gray-600">
          Already have an account? {' '}
          <Link to="/signin" className="text-[#ff4f00] font-bold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}