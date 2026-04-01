import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import AuthLayout from '../components/AuthLayout';
import { GoogleLogin } from '@react-oauth/google';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { signIn, googleAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await signIn({ email, password });
      
      // Specifically allow ONLY customers here. Others should use their own portals.
      if (loggedInUser.role === 'customer') {
          if (from) navigate(from, { replace: true });
          else navigate('/');
      } else {
          // If a rider/admin/partner tries to login here, redirect them or show error
          setError(`This portal is for customers. Please use the ${loggedInUser.role} portal.`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <AuthLayout
      theme="orange"
      title="Welcome Back"
      subtitle="Hey, welcome back up to your special place"
      footerText="Don't have an account?"
      footerAction="Sign Up"
      footerLink="/signup"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3 animate-shake">
            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Username or email
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input
              id="password"
              name="password"
              type={showPass ? 'text' : 'password'}
              autoComplete="current-password"
              className="w-full pl-12 pr-12 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-orange-500 border-orange-500' : 'bg-white border-slate-200 group-hover:border-orange-300'}`}>
              <input
                type="checkbox"
                className="hidden"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
              />
              {rememberMe && <CheckCircle2 className="text-white" size={12} strokeWidth={4} />}
            </div>
            <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">Remember me</span>
          </label>
          <Link to="/forgot-password" core="true" className="text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors underline decoration-dotted underline-offset-4">
            Forgot Password?
          </Link>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 bg-orange-500 hover:bg-orange-600"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Sign In'
          )}
        </button>
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Or continue with</span></div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={(response) => {
              googleAuth(response.credential)
                .then(() => navigate(from || '/'))
                .catch((err) => setError(err.message));
            }}
            onError={() => setError('Google Login Failed')}
            useOneTap
            shape="pill"
            theme="outline"
            text="signin_with"
            width="400"
          />
        </div>
      </form>


      {/* Demo Creds Hint */}
      <div className="mt-8 p-4 rounded-3xl border border-dashed flex items-center gap-4 border-orange-200 bg-orange-50/50">
        <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
          <Mail size={20} />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suggested Demo Credentials</p>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest line-clamp-1">user@foodcourt.com / user123</p>
        </div>
      </div>
    </AuthLayout>
  );
}

