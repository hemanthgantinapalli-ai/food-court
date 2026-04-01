import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import AuthLayout from '../components/AuthLayout';
import { GoogleLogin } from '@react-oauth/google';

export default function AdminSignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const { signIn, googleAuth } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/admin';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const loggedInUser = await signIn({ email, password });
            if (loggedInUser.role === 'admin') {
                navigate(from, { replace: true });
            } else {
                setError('Access denied. This portal is for administrators only.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            theme="purple"
            title="Admin Console"
            subtitle="Access the global control tower of FoodCourt"
            footerText="Manage the infrastructure behind every meal"
            footerAction="Internal Access Only"
            footerLink="/admin/signin"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3 animate-shake">
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label htmlFor="admin-email" className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        Admin Email
                    </label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-600 transition-colors" size={20} />
                        <input
                            id="admin-email"
                            name="email"
                            type="email"
                            autoComplete="username"
                            className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-purple-600 focus:ring-4 focus:ring-purple-600/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                            placeholder="admin@foodcourt.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="admin-password" className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        Secure Password
                    </label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-600 transition-colors" size={20} />
                        <input
                            id="admin-password"
                            name="password"
                            type={showPass ? 'text' : 'password'}
                            autoComplete="current-password"
                            className="w-full pl-12 pr-12 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-purple-600 focus:ring-4 focus:ring-purple-600/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
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

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-200 group-hover:border-purple-300'}`}>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={rememberMe}
                                onChange={() => setRememberMe(!rememberMe)}
                            />
                            {rememberMe && <CheckCircle2 className="text-white" size={12} strokeWidth={4} />}
                        </div>
                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">Stay logged in</span>
                    </label>
                    <Link to="/forgot-password" core="true" className="text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors underline decoration-dotted underline-offset-4">
                        Recovery?
                    </Link>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl shadow-purple-600/20 active:scale-[0.98] disabled:opacity-50 bg-purple-600 hover:bg-purple-700 font-sans"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        'Verify & Enter'
                    )}
                </button>

                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Or continue with</span></div>
                </div>

                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={(response) => {
                            googleAuth(response.credential, 'admin')
                                .then((user) => {
                                    if (user.role === 'admin') {
                                        navigate(from, { replace: true });
                                    } else {
                                        setError('This Google account is not registered as an administrator.');
                                    }
                                })
                                .catch((err) => setError(err.message));
                        }}
                        onError={() => setError('Google Authentication Failed')}
                        shape="pill"
                        theme="outline"
                        text="signin_with"
                        width="400"
                    />
                </div>
            </form>

            <div className="mt-8 p-4 rounded-3xl border border-dashed flex items-center gap-4 border-purple-200 bg-purple-50/50">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                    <ShieldCheck size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Authorization Required</p>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest line-clamp-1">admin@foodcourt.com / admin123</p>
                </div>
            </div>
        </AuthLayout>
    );
}
