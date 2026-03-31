import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../context/authStore.js';
import AuthLayout from '../components/AuthLayout';

export default function SignUp() {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'customer' });

  const { signUp, googleAuth } = useAuthStore();
  
  const handleCredentialResponse = async (credentialResponse) => {
    try {
        setLoading(true);
        // By default role can be 'customer', handles googleAuth creation/login
        const loggedInUser = await googleAuth(credentialResponse.credential, formData.role);
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            if (loggedInUser.role === 'admin') navigate('/admin');
            else if (loggedInUser.role === 'rider') navigate('/rider');
            else if (loggedInUser.role === 'restaurant') navigate('/partner');
            else navigate('/');
        }, 1500);
    } catch (err) {
        setError(err.message || 'Google Sign Up failed');
    } finally {
        setLoading(false);
    }
  };

  // Programmatic Google Sign-In initialization removed in favor of HTML-based configuration as per request.
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
        navigate('/signin');
      }, 2000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create account. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Sign up and start ordering your favourite food"
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
        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Full Name</label>
          <div className="relative group">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input
              id="name"
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
          <label htmlFor="email" className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Email Address</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input
              id="email"
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
          <label htmlFor="password" className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Create Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input
              id="password"
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

      <div className="relative mt-10 mb-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs font-black uppercase tracking-widest">
          <span className="bg-white px-4 text-slate-400">Or sign up with</span>
        </div>
      </div>

      <div className="flex justify-center mb-8">
        <div id="g_id_onload"
          data-client_id="490086107739-95l6hep5ivhaklsv6h1mri8024g2d9bg.apps.googleusercontent.com"
          data-context="signin"
          data-ux_mode="popup"
          data-auto_prompt="false">
        </div>

        <div className="g_id_signin"
          data-type="standard"
          data-shape="pill"
          data-theme="outline"
          data-text="signin_with"
          data-size="large">
        </div>
      </div>

    </AuthLayout>
  );
}
