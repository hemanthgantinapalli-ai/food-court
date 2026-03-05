import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, CheckCircle, KeyRound } from 'lucide-react';
import { useAuthStore } from '../context/authStore.js';
import AuthLayout from '../components/AuthLayout';

// ── Simple guard: only those who know the secret key can create an admin account ──
const ADMIN_SECRET = 'FOODCOURT_ADMIN_2024';

export default function AdminSignUp() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1 = secret key, 2 = registration form
    const [secretKey, setSecretKey] = useState('');
    const [secretError, setSecretError] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'admin' });

    const signUp = useAuthStore((s) => s.signUp);

    // Step 1: Verify secret key
    const handleVerifyKey = (e) => {
        e.preventDefault();
        if (secretKey.trim() === ADMIN_SECRET) {
            setSecretError('');
            setStep(2);
        } else {
            setSecretError('Invalid admin secret key. Contact your system administrator.');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        try {
            await signUp({ name: formData.name, email: formData.email, password: formData.password, role: 'admin' });
            setShowSuccess(true);
            setTimeout(() => {
                navigate('/admin');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to create admin account.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title={step === 1 ? 'Admin Verification' : 'Create Admin Account'}
            subtitle={step === 1 ? 'Enter your admin secret key to continue' : 'Set up your administrator credentials'}
            footerText="Already have an account?"
            footerAction="Sign In"
            footerLink="/admin/login"
        >
            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed top-6 right-6 bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 animate-fade-up">
                    <CheckCircle size={22} />
                    <div>
                        <p className="font-black">Admin Account Created! 🎉</p>
                        <p className="text-emerald-100 text-sm">Redirecting to Admin Panel...</p>
                    </div>
                </div>
            )}

            {/* ── STEP 1: Secret Key Verification ── */}
            {step === 1 && (
                <form onSubmit={handleVerifyKey} className="space-y-6">
                    {/* Security notice */}
                    <div className="flex items-start gap-4 p-4 bg-purple-50 border border-purple-100 rounded-2xl">
                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-purple-700 mb-1">Restricted Access</p>
                            <p className="text-xs text-purple-500 font-medium leading-relaxed">
                                Admin account creation requires a secret key. This prevents unauthorized access to the admin portal.
                            </p>
                        </div>
                    </div>

                    {secretError && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {secretError}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                            Admin Secret Key
                        </label>
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" size={20} />
                            <input
                                type="password"
                                className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                                placeholder="Enter secret key..."
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                                required
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-2">
                            Hint: <span className="text-purple-400">FOODCOURT_ADMIN_2024</span>
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl shadow-purple-500/20 active:scale-[0.98] bg-purple-600 hover:bg-purple-700"
                    >
                        <ShieldCheck size={18} />
                        Verify & Continue
                    </button>
                </form>
            )}

            {/* ── STEP 2: Registration Form ── */}
            {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Verified badge */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                        <CheckCircle className="text-emerald-500 shrink-0" size={18} />
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Identity Verified — Admin Access Granted</p>
                    </div>

                    {error && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
                        </div>
                    )}

                    {/* Full Name */}
                    <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Full Name</label>
                        <div className="relative group">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" size={20} />
                            <input
                                name="name"
                                type="text"
                                className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                                placeholder="Admin Full Name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" size={20} />
                            <input
                                name="email"
                                type="email"
                                className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                                placeholder="admin@foodcourt.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" size={20} />
                            <input
                                name="password"
                                type={showPass ? 'text' : 'password'}
                                className="w-full pl-12 pr-12 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                                placeholder="Min. 8 characters"
                                value={formData.password}
                                onChange={handleChange}
                                minLength={8}
                                required
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors">
                                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Confirm Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" size={20} />
                            <input
                                name="confirmPassword"
                                type={showConfirm ? 'text' : 'password'}
                                className="w-full pl-12 pr-12 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                                placeholder="Re-enter password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors">
                                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {/* Password match indicator */}
                        {formData.confirmPassword && (
                            <p className={`text-[10px] font-black uppercase tracking-widest pl-2 ${formData.password === formData.confirmPassword ? 'text-emerald-500' : 'text-rose-400'}`}>
                                {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                            </p>
                        )}
                    </div>

                    {/* Admin role badge */}
                    <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-100 rounded-2xl">
                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-0.5">Account Type</p>
                            <p className="font-black text-purple-800 text-sm uppercase tracking-wider">Administrator</p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || formData.password !== formData.confirmPassword}
                        className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 bg-purple-600 hover:bg-purple-700"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <ShieldCheck size={18} />
                                Create Admin Account
                            </>
                        )}
                    </button>
                </form>
            )}
        </AuthLayout>
    );
}
