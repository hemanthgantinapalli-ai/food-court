import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ArrowRight, CheckCircle, ShieldCheck, Bike } from 'lucide-react';
import { useAuthStore } from '../context/authStore.js';

export default function SignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: searchParams.get('role') || 'customer' });

  useEffect(() => {
    const role = searchParams.get('role');
    if (role) setFormData(prev => ({ ...prev, role }));
  }, [searchParams]);

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
      const msg = err.response?.data?.message || err.message || 'Failed to create account. Please try again.';
      setError(msg);
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
            <p className="text-slate-400 font-medium mt-2 text-sm uppercase tracking-widest">Create an account or <Link to="/" className="text-orange-500 hover:underline">browse as guest</Link></p>
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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Switcher */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { id: 'customer', label: 'Customer', icon: UserIcon, color: 'orange' },
                { id: 'admin', label: 'Admin', icon: ShieldCheck, color: 'purple' },
                { id: 'rider', label: 'Rider', icon: Bike, color: 'blue' }
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: r.id })}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 relative ${formData.role === r.id
                    ? `border-${r.color}-500 bg-${r.color}-50 text-${r.color}-600`
                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                    }`}
                >
                  <r.icon size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{r.label}</span>
                  {formData.role === r.id && <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm"><div className={`w-1.5 h-1.5 rounded-full bg-${r.color}-500`} /><CheckCircle size={10} className="hidden" /></div>}
                </button>
              ))}
            </div>

            {/* Role Indicator Info */}
            <div className={`mb-6 p-4 rounded-2xl border flex items-center gap-4 ${formData.role === 'admin' ? 'border-purple-100 bg-purple-50 text-purple-700' : formData.role === 'rider' ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-orange-100 bg-orange-50 text-orange-700'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm`}>
                {formData.role === 'admin' ? <ShieldCheck size={20} /> : formData.role === 'rider' ? <Bike size={20} /> : <UserIcon size={20} />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Registering account for</p>
                <p className="font-black text-sm uppercase tracking-wider">{formData.role}</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 font-sans">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  id="signup-name"
                  name="name"
                  type="text"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-bold text-slate-900"
                  placeholder="John Doe"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 font-sans">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-bold text-slate-900"
                  placeholder="you@example.com"
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 font-sans">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  id="signup-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className="w-full pl-12 pr-12 py-4 rounded-xl bg-white border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all font-bold text-slate-900"
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

            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
              By signing up, you agree to our{' '}
              <Link to="#" className="text-orange-500 hover:underline">Terms</Link>
              {' '}and{' '}
              <Link to="#" className="text-orange-500 hover:underline">Privacy Policy</Link>.
            </p>

            <button
              id="signup-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-orange-600 active:scale-[0.98] transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
              Already a foodie?{' '}
              <Link to="/signin" className="text-orange-500 hover:underline ml-2">
                Sign in instead →
              </Link>
            </p>
            <Link to="/" className="mt-4 inline-block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors">
              Continue as Guest
            </Link>
          </div>
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