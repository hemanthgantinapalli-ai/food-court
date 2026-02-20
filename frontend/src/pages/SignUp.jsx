import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../context/authStore.js';

export default function SignUp() {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  // Fixed: declare signUp before using it
  const signUp = useAuthStore((s) => s.signUp);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp(formData);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8F9FB]">

      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Success Toast */}
          {showSuccess && (
            <div className="fixed top-6 right-6 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 animate-fade-up">
              <CheckCircle size={22} />
              <div>
                <p className="font-black">Account Created! 🎉</p>
                <p className="text-green-100 text-sm">Redirecting you to the feast...</p>
              </div>
            </div>
          )}

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-10">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-sm">FC</span>
            </div>
            <span className="text-xl font-black text-slate-900">Food<span className="text-orange-500">Court</span></span>
          </Link>

          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Join FoodCourt 🍽️</h1>
            <p className="text-slate-400 font-medium mt-2">Create your free account in seconds</p>
          </div>

          {/* Perks */}
          <div className="flex gap-4 mb-8 flex-wrap">
            {['Free first delivery', 'Exclusive deals', '24/7 support'].map((perk) => (
              <div key={perk} className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full">
                <CheckCircle size={12} /> {perk}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 font-medium text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  id="signup-name"
                  name="name"
                  type="text"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-medium text-slate-900"
                  placeholder="John Doe"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-medium text-slate-900"
                  placeholder="you@example.com"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  id="signup-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className="w-full pl-12 pr-12 py-4 rounded-xl bg-white border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-medium text-slate-900"
                  placeholder="Min. 8 characters"
                  onChange={handleChange}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-medium">
              By signing up, you agree to our{' '}
              <Link to="#" className="text-orange-500 font-bold hover:underline">Terms</Link>
              {' '}and{' '}
              <Link to="#" className="text-orange-500 font-bold hover:underline">Privacy Policy</Link>.
            </p>

            <button
              id="signup-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-black text-base hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 font-medium">
            Already have an account?{' '}
            <Link to="/signin" className="text-orange-500 font-bold hover:underline">
              Sign in →
            </Link>
          </p>
        </div>
      </div>

      {/* Right: Visual panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-orange-500 to-red-600 items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-black/20 rounded-full blur-3xl" />

        <div className="relative z-10 text-white text-center">
          <div className="text-8xl mb-8 animate-float">🍕</div>
          <h2 className="text-4xl font-black tracking-tight mb-4">
            500,000+<br />Happy Foodies
          </h2>
          <p className="text-orange-100 font-medium text-lg max-w-sm leading-relaxed">
            Join the community that loves great food delivered fast. No compromises, only deliciousness.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4">
            {[
              { num: '1,200+', label: 'Restaurants' },
              { num: '4.9★', label: 'App Rating' },
              { num: '20 Min', label: 'Avg. Delivery' },
              { num: '24/7', label: 'Support' },
            ].map(({ num, label }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="font-black text-2xl">{num}</div>
                <div className="text-orange-200 text-xs font-bold uppercase tracking-wider mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}