import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, Bike } from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import AuthLayout from '../components/AuthLayout';

export default function RiderSignIn() {
    const [email, setEmail] = useState('rider@foodcourt.com');
    const [password, setPassword] = useState('rider123');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const { signIn } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    // Where to go after login
    const from = location.state?.from?.pathname || '/rider';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const loggedInUser = await signIn({ email, password });
            if (loggedInUser.role === 'rider') {
                navigate(from, { replace: true });
            } else {
                setError('Access denied. This portal is for riders only.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        alert('Google Sign In functionality coming soon!');
    };

    return (
        <AuthLayout
            title="Welcome Back"
            subtitle="Hey, welcome back up to your special place"
            footerText="Don't have a rider account?"
            footerAction="Apply Now"
            footerLink="/signup?role=rider"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3 animate-shake">
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
                    </div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        Username or email
                    </label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            type="email"
                            className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                            placeholder="rider@foodcourt.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        Password
                    </label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            type={showPass ? 'text' : 'password'}
                            className="w-full pl-12 pr-12 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
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
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200 group-hover:border-blue-300'}`}>
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
                    <Link to="/forgot-password" title="Forgot Password Page" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors underline decoration-dotted underline-offset-4">
                        Forgot Password?
                    </Link>
                </div>

                {/* Sign In Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 bg-blue-600 hover:bg-blue-700"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        'Sign In'
                    )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">or</span>
                    <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Google Sign In */}
                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-4 py-4 rounded-3xl bg-white border border-slate-100 font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-[0.98]"
                >
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="w-5 h-5" />
                    <span className="text-sm">Sign in with Google</span>
                </button>
            </form>

            {/* Demo Creds Hint */}
            <div className="mt-8 p-4 rounded-3xl border border-dashed flex items-center gap-4 border-blue-200 bg-blue-50/50">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                    <Bike size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pre-filled Demo Credentials</p>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest line-clamp-1">{email} / {password}</p>
                </div>
            </div>
        </AuthLayout>
    );
}
