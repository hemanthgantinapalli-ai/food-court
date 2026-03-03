import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, CheckCircle, ShieldCheck, Bike, Store } from 'lucide-react';
import { useAuthStore } from '../context/authStore.js';
import AuthLayout from '../components/AuthLayout';

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

  const roleColors = {
    customer: 'orange',
    admin: 'purple',
    rider: 'blue',
    restaurant: 'emerald'
  };

  const currentColor = roleColors[formData.role] || 'orange';

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join Academy and explore the future of dining"
      footerText="Already have an account?"
      footerAction="Sign In"
      footerLink="/signin"
    >
      {showSuccess && (
        <div className="fixed top-6 right-6 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 animate-fade-up">
          <CheckCircle size={22} />
          <div>
            <p className="font-black">Account Created! 🎉</p>
            <p className="text-green-100 text-sm">Redirecting you to the feast...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3 animate-shake">
          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Switcher */}
        <div className="grid grid-cols-4 gap-3 bg-slate-50 p-2 rounded-[2rem] border border-slate-100">
          {[
            { id: 'customer', icon: UserIcon },
            { id: 'admin', icon: ShieldCheck },
            { id: 'rider', icon: Bike },
            { id: 'restaurant', icon: Store }
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setFormData({ ...formData, role: r.id })}
              className={`flex items-center justify-center p-3 rounded-2xl transition-all duration-300 ${formData.role === r.id
                ? `bg-white text-${roleColors[r.id]}-500 shadow-sm border border-slate-100`
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <r.icon size={20} />
            </button>
          ))}
        </div>

        {/* Role Indicator Info (Mini) */}
        <div className={`p-4 rounded-3xl border flex items-center gap-4 transition-all bg-${currentColor}-50 border-${currentColor}-100 text-${currentColor}-700`}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white shadow-sm shrink-0">
            {formData.role === 'admin' ? <ShieldCheck size={20} /> : formData.role === 'rider' ? <Bike size={20} /> : formData.role === 'restaurant' ? <Store size={20} /> : <UserIcon size={20} />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Account Role</p>
            <p className="font-black text-sm uppercase tracking-wider">{formData.role}</p>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Full Name</label>
          <div className="relative group">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input
              name="name"
              type="text"
              className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
              placeholder="John Doe"
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Email Address</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input
              name="email"
              type="email"
              className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
              placeholder="you@example.com"
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Create Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input
              name="password"
              type={showPass ? 'text' : 'password'}
              className="w-full pl-12 pr-12 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
              placeholder="Min. 8 characters"
              onChange={handleChange}
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
            >
              {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 bg-orange-500 hover:bg-orange-600"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Create Account'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
