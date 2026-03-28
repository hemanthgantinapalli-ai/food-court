import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Send, KeyRound, Lock } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import axios from 'axios';

export default function ForgotPassword() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            const res = await axios.post('/api/auth/forgot-password', { email });
            if (res.data.success) {
                setSuccessMsg(res.data.message);
                setStep(2);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            const res = await axios.post('/api/auth/verify-otp', { email, otp });
            if (res.data.success) {
                setSuccessMsg(res.data.message);
                setStep(3);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            setLoading(false);
            return;
        }

        try {
            const res = await axios.post('/api/auth/reset-password', { email, otp, newPassword });
            if (res.data.success) {
                setSuccessMsg(res.data.message);
                setStep(4);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error resetting password.');
        } finally {
            setLoading(false);
        }
    };

    if (step === 4) {
        return (
            <AuthLayout
                title="Password Reset Successful"
                subtitle="Your password has been changed perfectly!"
                footerText="Ready to order?"
                footerAction="Sign In Now"
                footerLink="/signin"
            >
                <div className="text-center space-y-8 animate-fade-up">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 size={40} />
                    </div>

                    <div className="space-y-4">
                        <p className="text-slate-500 font-medium leading-relaxed">
                            {successMsg || 'You can now sign in with your new password.'}
                        </p>
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
            title={step === 1 ? "Forgot Password?" : step === 2 ? "Enter OTP" : "Reset Password"}
            subtitle={step === 1 ? "No worries, we'll send you reset instructions." : step === 2 ? `Enter the 6-digit code sent to ${email}` : "Create a strong new password."}
            footerText="Remembered your password?"
            footerAction="Sign In"
            footerLink="/signin"
        >
            <form onSubmit={step === 1 ? handleRequestOtp : step === 2 ? handleVerifyOtp : handleResetPassword} className="space-y-8 animate-fade-up">
                {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
                    </div>
                )}
                {successMsg && step !== 4 && (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> {successMsg}
                    </div>
                )}

                {step === 1 && (
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
                )}

                {step === 2 && (
                    <div className="space-y-3 animate-fade-in text-center">
                        <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 text-left">
                            6-Digit Reset Code
                        </label>
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                            <input
                                type="text"
                                maxLength="6"
                                className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-black text-slate-900 tracking-[0.5em]"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-3 animate-fade-in">
                        <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                            New Password
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                            <input
                                type="password"
                                className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                                placeholder="Secure password"
                                minLength="6"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 bg-orange-500 hover:bg-orange-600"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            {step === 1 ? 'Send Reset Link' : step === 2 ? 'Verify Code' : 'Update Password'} <Send size={18} />
                        </>
                    )}
                </button>

                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400">
                    <button
                        type="button"
                        onClick={() => {
                            if (step > 1) {
                                setStep(step - 1);
                                setError('');
                                setSuccessMsg('');
                            }
                        }}
                        className={`flex items-center gap-2 hover:text-slate-900 transition-colors ${step === 1 ? 'invisible' : ''}`}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    
                    <Link
                        to="/signin"
                        className="hover:text-slate-900 transition-colors"
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}
