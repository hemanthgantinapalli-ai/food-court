import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';
import API from '../api/axios';
import { Bike, ArrowRight, ShieldCheck, User as UserIcon, CheckCircle2, Phone, KeySquare, Camera, Car, CreditCard } from 'lucide-react';

export default function RiderSignIn() {
    const [activeTab, setActiveTab] = useState('login'); // 'login' or 'signup'
    const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Profile (for signup only)

    // Form State
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        vehicleType: 'bike',
        vehicleNumber: '',
        licenseNumber: '',
        aadhaarNumber: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const navigate = useNavigate();
    // We can just manually set User to authStore after login
    const setAuth = useAuthStore(state => state.signIn); // Wait we need to set manually, we'll fetch from API directly and then update store.

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!phone) return setError('Please enter a valid phone number');
        setError('');
        setLoading(true);
        try {
            await API.post('/riders/auth/send-otp', { phone });
            setStep(2);
            setSuccessMsg(`MOCK OTP SENT. Please enter 123456 to continue.`);
            window.alert(`[FoodCourt Simulator]\n\nAn OTP has been sent to +91 ${phone}.\n\nYour Mock Verification Code is: 123456`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtpForLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await API.post('/riders/auth/login', { phone, otp });
            const { token, user } = res.data;

            // Update AuthStore manually
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            window.location.href = '/rider'; // Force reload to ensure auth store picks it up, or we can use zustand properly
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtpForSignup = async (e) => {
        e.preventDefault();
        if (otp === '123456') { // simple check to move to profile setup
            setStep(3);
            setError('');
        } else {
            setError('Invalid OTP');
        }
    };

    const handleCompleteSignup = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const payload = { ...formData, phone, otp };
            const res = await API.post('/riders/auth/signup', payload);
            setSuccessMsg(res.data.message);
            setStep(4); // Show success pending screen
        } catch (err) {
            setError(err.response?.data?.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#F8F9FB] font-sans">
            {/* Left Panel */}
            <div className="hidden lg:flex w-1/2 items-center justify-center p-16 relative overflow-hidden bg-blue-950 transition-colors duration-700">
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 bg-blue-500" />
                <div className="relative z-10 text-center max-w-lg">
                    <div className="mb-12 inline-flex p-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                        <Bike size={80} className="text-blue-400" />
                    </div>
                    <h2 className="text-white text-5xl font-black tracking-tight mb-6 leading-tight">
                        The <span className="text-blue-400">Rider</span> Network
                    </h2>
                    <p className="text-slate-400 text-xl font-medium leading-relaxed">
                        Deliver deliciousness securely. Access your fleet dashboard with just your phone number.
                    </p>
                </div>
            </div>

            {/* Right Form */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
                <div className="w-full max-w-md">
                    {/* Tabs */}
                    {step === 1 && (
                        <div className="flex p-1 bg-slate-100 rounded-xl mb-10 shadow-inner">
                            <button
                                onClick={() => { setActiveTab('login'); setError(''); setSuccessMsg(''); }}
                                className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => { setActiveTab('signup'); setError(''); setSuccessMsg(''); }}
                                className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'signup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                Create Account
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl mb-6 font-bold text-xs uppercase tracking-wide flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
                        </div>
                    )}
                    {successMsg && step !== 4 && (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-xl mb-6 font-bold text-xs uppercase tracking-wide flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> {successMsg}
                        </div>
                    )}

                    {/* STEP 1: Phone */}
                    {step === 1 && (
                        <form onSubmit={handleSendOtp} className="space-y-6 animate-fade-up">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                                {activeTab === 'login' ? 'Welcome Back' : 'Join the Fleet'}
                            </h1>
                            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-8">
                                Enter your mobile number to continue
                            </p>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Phone Number</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">+91</span>
                                    <input
                                        type="tel"
                                        className="w-full pl-14 pr-4 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 tracking-wider"
                                        placeholder="9876543210"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                        maxLength={10}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || phone.length < 10}
                                className="w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-blue-600 font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Send OTP <ArrowRight size={18} /></>}
                            </button>
                        </form>
                    )}

                    {/* STEP 2: OTP */}
                    {step === 2 && (
                        <form onSubmit={activeTab === 'login' ? handleVerifyOtpForLogin : handleVerifyOtpForSignup} className="space-y-6 animate-fade-up">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Verify Phone</h1>
                            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-8">
                                Enter the 6-digit code sent to +91 {phone}
                            </p>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">One Time Password</label>
                                <div className="relative group">
                                    <KeySquare className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-black text-slate-900 tracking-[0.5em] text-center text-lg"
                                        placeholder="••••••"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        maxLength={6}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.length < 6}
                                className="w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-slate-900 font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Verify & Continue <CheckCircle2 size={18} /></>}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
                            >
                                Change Phone Number
                            </button>
                        </form>
                    )}

                    {/* STEP 3: Profile Setup (Signup only) */}
                    {step === 3 && (
                        <form onSubmit={handleCompleteSignup} className="space-y-4 animate-fade-up">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Rider Profile</h1>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-6">Complete mandatory details to apply</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Full Name</label>
                                    <input type="text" required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 font-bold outline-none" placeholder="As per Aadhaar" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vehicle Type</label>
                                        <select value={formData.vehicleType} onChange={e => setFormData({ ...formData, vehicleType: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 font-bold outline-none bg-white">
                                            <option value="bike">Bike</option>
                                            <option value="scooter">Scooter</option>
                                            <option value="bicycle">Bicycle</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vehicle No.</label>
                                        <input type="text" required value={formData.vehicleNumber} onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 font-bold outline-none uppercase" placeholder="AP09BZ1234" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Driving License</label>
                                    <input type="text" required value={formData.licenseNumber} onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 font-bold outline-none uppercase" placeholder="DL Number" />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Aadhaar Number</label>
                                    <input type="text" required value={formData.aadhaarNumber} onChange={e => setFormData({ ...formData, aadhaarNumber: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 font-bold outline-none tracking-widest" placeholder="1234 5678 9012" maxLength={12} />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 mt-6 py-4 rounded-[1rem] bg-blue-600 font-black text-xs uppercase tracking-[0.2em] text-white transition-all hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit Application'}
                            </button>
                        </form>
                    )}

                    {/* STEP 4: Success / Pending */}
                    {step === 4 && (
                        <div className="text-center animate-fade-up">
                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck size={40} className="text-blue-500" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Application Submitted!</h2>
                            <p className="text-slate-500 font-medium leading-relaxed mb-8">
                                We have received your details. Your profile status is <span className="text-blue-600 font-bold">PENDING</span>.
                                Our team will verify your documents shortly. You will be able to log in once approved by the admin.
                            </p>
                            <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors">
                                Back to Home
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
