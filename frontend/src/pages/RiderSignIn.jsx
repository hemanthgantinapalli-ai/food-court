import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, Bike, ShieldCheck, Phone } from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import AuthLayout from '../components/AuthLayout';
import API from '../api/axios';

export default function RiderSignIn() {
    const [mode, setMode] = useState('login'); // 'login', 'signup', 'pending'
    const [email, setEmail] = useState('rider@foodcourt.com');
    const [password, setPassword] = useState('rider123');
    const [showPass, setShowPass] = useState(false);

    // Signup specific state
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        vehicleType: 'bike',
        vehicleNumber: '',
        licenseNumber: '',
        aadhaarNumber: '',
    });

    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    // Where to go after login
    const from = location.state?.from?.pathname || '/rider';

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Use the specific Rider endpoint to ensure approval check happens
            const res = await API.post('/riders/auth/login', { email, password });
            const { token, user } = res.data;

            // Set localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Hydrate Zustand auth store state directly
            useAuthStore.setState({ user, token });

            navigate(from, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await API.post('/riders/auth/signup', {
                email,
                password,
                ...formData
            });
            setMode('pending');
        } catch (err) {
            setError(err.response?.data?.message || 'Signup failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        alert('Google Sign In functionality coming soon!');
    };

    if (mode === 'pending') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] font-sans">
                <div className="text-center animate-fade-up max-w-md p-10 bg-white shadow-xl rounded-3xl">
                    <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck size={40} className="text-orange-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Application Submitted!</h2>
                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        We have received your details. Your profile status is <span className="text-orange-600 font-bold">PENDING</span>.
                        Our team will verify your documents shortly. You will be able to log in once approved by the admin.
                    </p>
                    <button onClick={() => navigate('/')} className="px-8 py-3 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors">
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'signup') {
        return (
            <AuthLayout
                title="Join the Fleet"
                subtitle="Complete mandatory details to apply as a rider"
                footerText="Already have an account?"
                footerAction="Sign In"
                onFooterClick={() => { setMode('login'); setError(''); }}
            >
                <form onSubmit={handleSignup} className="space-y-4 animate-fade-up">
                    {error && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3 animate-shake">
                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Account details</label>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 font-bold outline-none" placeholder="Email Address" />
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 font-bold outline-none" placeholder="Password (Min 6 chars)" minLength={6} />
                    </div>

                    <div className="space-y-2 mt-4">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Personal Info</label>
                        <input type="text" required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 font-bold outline-none" placeholder="Full Name (As per Aadhaar)" />
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 font-bold outline-none" placeholder="Phone Number" maxLength={10} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <select value={formData.vehicleType} onChange={e => setFormData({ ...formData, vehicleType: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 font-bold outline-none bg-white">
                                <option value="bike">Bike</option>
                                <option value="scooter">Scooter</option>
                                <option value="bicycle">Bicycle</option>
                            </select>
                        </div>
                        <div>
                            <input type="text" required value={formData.vehicleNumber} onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 font-bold outline-none uppercase" placeholder="Vehicle No." />
                        </div>
                    </div>

                    <div>
                        <input type="text" required value={formData.licenseNumber} onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 font-bold outline-none uppercase" placeholder="Driving License Number" />
                    </div>

                    <div>
                        <input type="text" required value={formData.aadhaarNumber} onChange={e => setFormData({ ...formData, aadhaarNumber: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 font-bold outline-none tracking-widest" placeholder="Aadhaar Number (12 Digits)" maxLength={12} />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 mt-4 py-4 rounded-[1rem] bg-orange-500 font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 hover:bg-orange-600"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit Application'}
                    </button>
                </form>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Welcome Back"
            subtitle="Hey, welcome back up to your special place"
            footerText="Don't have a rider account?"
            footerAction="Apply Now"
            onFooterClick={() => { setMode('signup'); setError(''); }}
        >
            <form onSubmit={handleLogin} className="space-y-6">
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
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                        <input
                            type="email"
                            className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
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
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                        <input
                            type={showPass ? 'text' : 'password'}
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
                    <Link to="/forgot-password" title="Forgot Password Page" className="text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors underline decoration-dotted underline-offset-4">
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

            <div className="mt-8 p-4 rounded-3xl border border-dashed flex items-center gap-4 border-orange-200 bg-orange-50/50">
                <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
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
