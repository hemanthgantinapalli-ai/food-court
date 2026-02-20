import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../context/authStore';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const { signIn } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ email, password });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8F9FB]">

      {/* Left: Illustration Panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 to-orange-950 items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 text-center">
          <div className="grid grid-cols-2 gap-4 mb-12">
            {[
              'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80',
              'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&q=80',
              'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=300&q=80',
              'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&q=80',
            ].map((src, i) => (
              <div key={i} className="rounded-2xl overflow-hidden aspect-square shadow-2xl border border-white/10">
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          <h2 className="text-white text-3xl font-black tracking-tight mb-3">
            Your favorite food,<br />
            <span className="text-orange-400">at your doorstep.</span>
          </h2>
          <p className="text-slate-400 font-medium">Join 500,000+ food lovers on FoodCourt</p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-10">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-sm">FC</span>
            </div>
            <span className="text-xl font-black text-slate-900">Food<span className="text-orange-500">Court</span></span>
          </Link>

          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Welcome back 👋</h1>
            <p className="text-slate-400 font-medium mt-2">Sign in to continue your flavor journey</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 font-medium text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  id="signin-email"
                  type="email"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-medium text-slate-900"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Password</label>
                <Link to="#" className="text-xs font-bold text-orange-500 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  id="signin-password"
                  type={showPass ? 'text' : 'password'}
                  className="w-full pl-12 pr-12 py-4 rounded-xl bg-white border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-medium text-slate-900"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <button
              id="signin-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-xl font-black text-base hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 font-medium">
            Don't have an account?{' '}
            <Link to="/signup" className="text-orange-500 font-bold hover:underline">
              Create one free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}