import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Mock password reset request
        try {
            // simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            setSubmitted(true);
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <AuthLayout
                title="Check Your Email"
                subtitle={`We've sent password reset instructions to ${email}`}
                footerText="Didn't receive the email?"
                footerAction="Try again"
                footerLink="/forgot-password"
            >
                <div className="text-center space-y-8 animate-fade-up">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 size={40} />
                    </div>

                    <div className="space-y-4">
                        <p className="text-slate-500 font-medium leading-relaxed">
                            Please check your inbox and click on the verification link to reset your password.
                        </p>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Check your spam folder if you don't see it!
                        </div>
                    </div>

                    <Link
                        to="/signin"
                        className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-white bg-slate-900 hover:bg-orange-600 transition-all shadow-xl active:scale-[0.98]"
                    >
                        <ArrowLeft size={18} /> Back to Sign In
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Forgot Password?"
            subtitle="No worries, we'll send you reset instructions."
            footerText="Remembered your password?"
            footerAction="Sign In"
            footerLink="/signin"
        >
            <form onSubmit={handleSubmit} className="space-y-8 animate-fade-up">
                {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
                    </div>
                )}

                <div className="space-y-3">
                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        Email Address
                    </label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                        <input
                            type="email"
                            className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
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
                        <>
                            Send Reset Link <Send size={18} />
                        </>
                    )}
                </button>

                <Link
                    to="/signin"
                    className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Sign In
                </Link>
            </form>
        </AuthLayout>
    );
}
