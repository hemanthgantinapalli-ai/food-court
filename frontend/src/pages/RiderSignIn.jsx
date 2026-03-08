import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
    Mail, Lock, Eye, EyeOff, Bike, Phone, CheckCircle,
    MapPin, FileText, ShieldCheck, ChevronRight, ArrowLeft, Truck, Upload, X, Camera
} from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import API from '../api/axios';

function ImageUploadField({ label, fieldKey, value, onChange, icon: Icon, required = false, accept = 'image/*', previewCircle = false }) {
    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => onChange(fieldKey, ev.target.result);
        reader.readAsDataURL(file);
    };
    const inputId = `upload-${fieldKey}`;
    return (
        <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400">{label}{required && <span className="text-rose-400 ml-1">*</span>}</label>
            <label htmlFor={inputId} className="flex items-center gap-3 cursor-pointer group">
                <div className={`relative flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/80 border ${value ? 'border-indigo-500/60' : 'border-white/10'} hover:border-indigo-500/40 transition-all`}>
                    <Icon size={16} className="text-slate-500 shrink-0" />
                    <span className={`text-sm font-bold truncate ${value ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {value ? '✓ Image uploaded' : 'Click to upload image'}
                    </span>
                    <Upload size={14} className="ml-auto text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    <input id={inputId} type="file" accept={accept} onChange={handleFile} className="hidden" />
                </div>
                {value && (
                    <button type="button" onClick={() => onChange(fieldKey, '')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all shrink-0">
                        <X size={16} />
                    </button>
                )}
            </label>
            {value && (
                <div className={`overflow-hidden border-2 border-indigo-500/30 ${previewCircle ? 'w-20 h-20 rounded-full mx-auto' : 'w-full h-36 rounded-xl'}`}>
                    <img src={value} alt="preview" className="w-full h-full object-cover" />
                </div>
            )}
        </div>
    );
}

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
    const from = location.state?.from?.pathname || '/rider';

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await API.post('/riders/auth/login', { email, password });
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
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

        // Strict Validation
        if (!/^\d{10}$/.test(formData.phone)) {
            return setError('Phone number must be exactly 10 digits.');
        }
        if (!/^\d{12}$/.test(formData.aadhaarNumber)) {
            return setError('Aadhaar number must be exactly 12 digits.');
        }
        if (formData.licenseNumber.length < 5) {
            return setError('Please enter a valid License Number.');
        }
        if (formData.vehicleNumber.length < 4) {
            return setError('Please enter a valid Vehicle Number.');
        }
        if (!formData.aadhaarImage) {
            return setError('Please upload a photo of your Aadhaar card.');
        }
        if (!formData.licenseImage) {
            return setError('Please upload a photo of your Driving License.');
        }

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

    // ── PENDING SCREEN ──────────────────────────────────────────────────
    if (mode === 'pending') {
        return (
            <div className="min-h-screen flex items-center justify-center font-sans bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6">
                <div className="text-center animate-fade-up max-w-md w-full">
                    <div className="relative w-32 h-32 mx-auto mb-8">
                        <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
                        <div className="relative w-32 h-32 bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center justify-center">
                            <CheckCircle size={52} className="text-indigo-400" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight mb-4">Application Submitted!</h2>
                    <p className="text-slate-400 font-medium leading-relaxed mb-2">
                        Your rider profile is currently{' '}
                        <span className="text-indigo-400 font-black">PENDING REVIEW</span>.
                    </p>
                    <p className="text-slate-500 text-sm mb-10">
                        Our admin team will verify your documents and approve your account shortly.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-10 py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-900/50"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // ── SIGNUP SCREEN ────────────────────────────────────────────────────
    if (mode === 'signup') {
        return (
            <div className="min-h-screen font-sans bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex">
                {/* Left Branding Panel */}
                <div className="hidden lg:flex w-2/5 flex-col justify-between p-12 relative overflow-hidden">
                    <div className="absolute top-[-20%] right-[-15%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-15%] w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[100px]" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-16">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                                <Truck size={20} className="text-white" />
                            </div>
                            <span className="font-black text-white text-lg tracking-tight">Rider Portal</span>
                        </div>

                        <h2 className="text-white text-4xl font-black tracking-tight leading-tight mb-6">
                            Join the<br /><span className="text-indigo-400">Delivery</span><br />Revolution
                        </h2>
                        <p className="text-slate-400 text-base font-medium leading-relaxed">
                            Earn on your own schedule. Deliver happiness across the city and grow with us.
                        </p>

                        <div className="mt-12 space-y-4">
                            {[
                                { icon: '💰', title: 'Great Earnings', desc: 'Up to ₹800/day based on deliveries' },
                                { icon: '🕐', title: 'Flexible Hours', desc: 'Work when you want, rest when you need' },
                                { icon: '🛡️', title: 'Insured Rides', desc: 'Accident coverage on every delivery' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <span className="text-2xl">{item.icon}</span>
                                    <div>
                                        <p className="text-white font-black text-sm">{item.title}</p>
                                        <p className="text-slate-400 text-xs font-medium mt-0.5">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="relative z-10 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                        FoodCourt Rider Platform v1.0
                    </p>
                </div>

                {/* Right Form Panel */}
                <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
                    <div className="w-full max-w-[480px] py-10 animate-fade-up">

                        {/* Mobile Logo */}
                        <div className="lg:hidden flex items-center gap-3 mb-10">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
                                <Truck size={18} className="text-white" />
                            </div>
                            <span className="font-black text-white text-base tracking-tight">Rider Portal</span>
                        </div>

                        <h1 className="text-3xl font-black text-white tracking-tight mb-1">Apply as a Rider</h1>
                        <p className="text-slate-400 font-medium mb-8 text-sm">Fill in your details to start your journey</p>

                        {error && (
                            <div className="mb-6 px-4 py-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3">
                                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
                            </div>
                        )}

                        <form onSubmit={handleSignup} className="space-y-5">
                            {/* Account Credentials */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Account Credentials</p>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-800/80 border border-white/10 text-white font-bold placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        placeholder="Email Address"
                                    />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-slate-800/80 border border-white/10 text-white font-bold placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        placeholder="Password (Min 6 chars)" minLength={6}
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Personal Info */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Personal Info</p>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="text" required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-800/80 border border-white/10 text-white font-bold placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        placeholder="Full Name (as per Aadhaar)"
                                    />
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="text" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-800/80 border border-white/10 text-white font-bold placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        placeholder="Phone Number (10 Digits)" maxLength={10}
                                    />
                                </div>
                                {/* Profile Photo Upload */}
                                <ImageUploadField
                                    label="Profile Photo (Optional)"
                                    fieldKey="profilePhoto"
                                    value={formData.profilePhoto}
                                    onChange={handleImageChange}
                                    icon={Camera}
                                    previewCircle
                                />
                            </div>

                            {/* Vehicle Details */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Vehicle Details</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <Bike className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <select
                                            value={formData.vehicleType} onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                                            className="w-full pl-10 pr-3 py-3.5 rounded-xl bg-slate-800/80 border border-white/10 text-white font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                                        >
                                            <option value="bike">Bike</option>
                                            <option value="scooter">Scooter</option>
                                            <option value="bicycle">Bicycle</option>
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input
                                            type="text" required value={formData.vehicleNumber} onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                                            className="w-full pl-10 pr-3 py-3.5 rounded-xl bg-slate-800/80 border border-white/10 text-white font-bold uppercase placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                            placeholder="MH12AB1234"
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="text" required value={formData.licenseNumber} onChange={e => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-800/80 border border-white/10 text-white font-bold uppercase placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        placeholder="Driving License Number"
                                    />
                                </div>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="text" required value={formData.aadhaarNumber} onChange={e => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-800/80 border border-white/10 text-white font-bold tracking-widest placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        placeholder="Aadhaar Number (12 Digits)" maxLength={12}
                                    />
                                </div>
                            </div>

                            {/* Document Uploads */}
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">📄 Document Uploads</p>
                                <p className="text-[10px] text-slate-500 font-bold -mt-2">Clear photos required — ensure text is readable</p>
                                <ImageUploadField
                                    label="Aadhaar Card Photo"
                                    fieldKey="aadhaarImage"
                                    value={formData.aadhaarImage}
                                    onChange={handleImageChange}
                                    icon={ShieldCheck}
                                    required
                                />
                                <ImageUploadField
                                    label="Driving License Photo"
                                    fieldKey="licenseImage"
                                    value={formData.licenseImage}
                                    onChange={handleImageChange}
                                    icon={FileText}
                                    required
                                />
                            </div>

                            <button
                                type="submit" disabled={loading}
                                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-black text-sm uppercase tracking-[0.15em] text-white transition-all shadow-xl shadow-indigo-900/50 active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Bike size={18} /> Submit Application</>}
                            </button>
                        </form>

                        <p className="text-center mt-8 text-slate-500 text-sm font-bold">
                            Already a rider?{' '}
                            <button onClick={() => { setMode('login'); setError(''); setEmail(''); setPassword(''); }} className="text-indigo-400 hover:text-indigo-300 font-black underline underline-offset-4 transition-colors">
                                Sign In
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── LOGIN SCREEN ─────────────────────────────────────────────────────
    return (
        <div className="min-h-screen font-sans bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex">
            {/* Left Branding Panel */}
            <div className="hidden lg:flex w-2/5 flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-15%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-15%] w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[100px]" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                            <Truck size={20} className="text-white" />
                        </div>
                        <span className="font-black text-white text-lg tracking-tight">Rider Portal</span>
                    </div>

                    <h2 className="text-white text-5xl font-black tracking-tight leading-tight mb-6">
                        Your Road,<br /><span className="text-indigo-400">Your Rules.</span>
                    </h2>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed mb-12">
                        The fastest delivery partners in the city. Login to manage your deliveries, track earnings, and go online.
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { value: '2K+', label: 'Active Riders' },
                            { value: '₹800', label: 'Avg Daily Earn' },
                            { value: '4.9★', label: 'Avg Rating' },
                        ].map((s, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                                <p className="text-indigo-400 font-black text-xl">{s.value}</p>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="relative z-10 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                    FoodCourt Rider Platform v1.0
                </p>
            </div>

            {/* Right Login Form */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-[400px] animate-fade-up">

                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-10">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
                            <Truck size={18} className="text-white" />
                        </div>
                        <span className="font-black text-white text-base tracking-tight">Rider Portal</span>
                    </div>

                    {/* Back to home */}
                    <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs font-black uppercase tracking-widest mb-8 transition-colors">
                        <ArrowLeft size={14} /> Home
                    </Link>

                    <h1 className="text-4xl font-black text-white tracking-tight mb-1">Welcome Back</h1>
                    <p className="text-slate-400 font-medium text-sm mb-10">Sign in to your rider account</p>

                    {error && (
                        <div className="mb-6 px-4 py-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl font-bold text-xs uppercase tracking-wide flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={18} />
                                <input
                                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                    className="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-800/80 border border-white/10 text-white font-bold placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    placeholder="Enter your email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors" size={18} />
                                <input
                                    type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                                    className="w-full pl-11 pr-12 py-4 rounded-2xl bg-slate-800/80 border border-white/10 text-white font-bold placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Sign In Button */}
                        <button
                            type="submit" disabled={loading}
                            className="w-full flex items-center justify-center gap-3 py-4 mt-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-black text-sm uppercase tracking-[0.15em] text-white transition-all shadow-xl shadow-indigo-900/50 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading
                                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <><span>Sign In</span><ChevronRight size={18} /></>
                            }
                        </button>
                    </form>

                    {/* Apply footer */}
                    <p className="text-center mt-8 text-slate-500 text-sm font-bold">
                        Want to deliver with us?{' '}
                        <button
                            onClick={() => { setMode('signup'); setError(''); setEmail(''); setPassword(''); }}
                            className="text-indigo-400 hover:text-indigo-300 font-black underline underline-offset-4 transition-colors"
                        >
                            Apply Now
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
