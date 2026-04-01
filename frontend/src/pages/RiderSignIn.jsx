import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Bike, Phone, CheckCircle, MapPin, FileText, ShieldCheck, ChevronRight, Truck, Camera } from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import API from '../api/axios';
import ImageUploadField from '../components/ImageUploadField';
import AuthLayout from '../components/AuthLayout';
import { GoogleLogin } from '@react-oauth/google';

export default function RiderSignIn() {
    const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'pending'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        profilePhoto: '',
        vehicleType: 'bike',
        vehicleNumber: '',
        licenseNumber: '',
        aadhaarNumber: '',
        aadhaarImage: '',
        licenseImage: '',
    });

    const handleImageChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const { signIn, googleAuth } = useAuthStore();
    const from = location.state?.from?.pathname || '/rider';

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Use the same signIn from authStore but handle rider login specifically if needed on backend
            // For now, the backend has /riders/auth/login but authStore's signIn uses /auth/login
            // I'll use the specific rider login endpoint to match existing logic
            const res = await API.post('/riders/auth/login', { email, password });
            const { token, user } = res.data;
            
            // Sync with authStore
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            useAuthStore.setState({ user, token });

            if (user.role === 'rider') {
                navigate(from, { replace: true });
            } else {
                setError('Access denied. This portal is for delivery riders only.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');

        if (!/^\d{10}$/.test(formData.phone)) return setError('Phone number must be 10 digits.');
        if (!/^\d{12}$/.test(formData.aadhaarNumber)) return setError('Aadhaar must be 12 digits.');
        if (!formData.aadhaarImage || !formData.licenseImage) return setError('Please upload all required documents.');

        setLoading(true);
        try {
            await API.post('/riders/auth/signup', { email, password, ...formData });
            setMode('pending');
        } catch (err) {
            setError(err.response?.data?.message || 'Signup failed.');
        } finally {
            setLoading(false);
        }
    };

    if (mode === 'pending') {
        return (
            <div className="min-h-screen flex items-center justify-center font-sans bg-slate-50 p-6">
                <div className="text-center max-w-md w-full bg-white p-12 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                    <div className="relative w-24 h-24 mx-auto mb-8">
                        <div className="absolute inset-0 bg-sky-500/20 rounded-full animate-ping" />
                        <div className="relative w-24 h-24 bg-sky-50 border border-sky-100 rounded-full flex items-center justify-center">
                            <CheckCircle size={40} className="text-sky-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Application Submitted!</h2>
                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        Your rider profile is currently <span className="text-sky-600 font-black">PENDING REVIEW</span>. We'll verify your docs soon.
                    </p>
                    <button onClick={() => navigate('/')} className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-black transition-all">
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <AuthLayout
            theme="sky"
            title={mode === 'login' ? 'Rider Login' : 'Rider Application'}
            subtitle={mode === 'login' ? 'Sign in to start your delivery shift' : 'Join the fastest delivery network'}
            footerText={mode === 'login' ? "Want to deliver with us?" : "Already a rider?"}
            footerAction={mode === 'login' ? "Apply Now" : "Sign In"}
            footerLink="#"
            onFooterAction={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
            }}
        >
            {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Rider Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-600 transition-colors" size={20} />
                            <input
                                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-sky-600 focus:ring-4 focus:ring-sky-600/5 outline-none transition-all font-bold text-slate-900"
                                placeholder="rider@foodcourt.com"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Security Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-600 transition-colors" size={20} />
                            <input
                                type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                                className="w-full pl-12 pr-12 py-4 rounded-3xl bg-white border border-slate-100 shadow-sm focus:border-sky-600 focus:ring-4 focus:ring-sky-600/5 outline-none transition-all font-bold text-slate-900"
                                placeholder="••••••••"
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-3 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl shadow-sky-600/20 active:scale-[0.98] bg-sky-600 hover:bg-sky-700">
                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Log into Shift'}
                    </button>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Or continue with</span></div>
                    </div>

                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={(response) => {
                                googleAuth(response.credential, 'rider')
                                    .then((user) => {
                                        if (user.role === 'rider') {
                                            navigate(from, { replace: true });
                                        } else {
                                            setError('This Google account is not registered as a delivery rider.');
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
            ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="flex justify-center mb-2">
                        <GoogleLogin
                            onSuccess={(response) => {
                                try {
                                    const payload = JSON.parse(atob(response.credential.split('.')[1]));
                                    setEmail(payload.email || '');
                                    setFormData(prev => ({ ...prev, fullName: payload.name || '' }));
                                } catch (e) {
                                    setError('Could not read Google Profile');
                                }
                            }}
                            onError={() => setError('Google Authentication Failed')}
                            shape="pill"
                            theme="outline"
                            text="signup_with"
                            width="400"
                        />
                    </div>
                    
                    {/* Compact Signup Form */}
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                         {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase">{error}</div>}
                         
                         <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">Creds & Personal</p>
                            <input type="email" placeholder="Email Address" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-sky-500" value={email} onChange={e => setEmail(e.target.value)} required />
                            <input type="password" placeholder="Create Password" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-sky-500" value={password} onChange={e => setPassword(e.target.value)} required />
                            <input type="text" placeholder="Full Name" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-sky-500" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
                            <input type="text" placeholder="Phone (10 Digits)" maxLength={10} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-sky-500" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                         </div>

                         <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">Vehicle & IDs</p>
                            <div className="grid grid-cols-2 gap-2">
                                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-sky-500" value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})}>
                                    <option value="bike">Bike</option>
                                    <option value="scooter">Scooter</option>
                                </select>
                                <input type="text" placeholder="Vehicle No" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-sky-500 uppercase" value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value.toUpperCase()})} required />
                            </div>
                            <input type="text" placeholder="Aadhaar Number (12 Digits)" maxLength={12} className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-sky-500" value={formData.aadhaarNumber} onChange={e => setFormData({...formData, aadhaarNumber: e.target.value})} required />
                         </div>

                         <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">Verification Photos</p>
                            <div className="grid grid-cols-2 gap-4">
                                <ImageUploadField label="Profile" value={formData.profilePhoto} onChange={url => handleImageChange('profilePhoto', url)} icon={Camera} required previewCircle />
                                <ImageUploadField label="Aadhaar" value={formData.aadhaarImage} onChange={url => handleImageChange('aadhaarImage', url)} icon={FileText} required />
                                <ImageUploadField label="License" value={formData.licenseImage} onChange={url => handleImageChange('licenseImage', url)} icon={ShieldCheck} required />
                            </div>
                         </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 font-black text-xs uppercase tracking-widest text-white transition-all shadow-lg active:scale-[0.98] disabled:opacity-50">
                        {loading ? 'Submitting...' : 'Apply as Rider'}
                    </button>
                </form>
            )}
        </AuthLayout>
    );
}
