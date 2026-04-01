import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Store, Mail, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft,
    CheckCircle, FileText, CreditCard, MapPin, Phone, Building2,
    UtensilsCrossed, Upload, Shield, Receipt, Landmark, X, Image
} from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import API from '../api/axios';
import ImageUploadField from '../components/ImageUploadField';
import { GoogleLogin } from '@react-oauth/google';

// Removed UrlInputField in favor of shared ImageUploadField component from ../components/ImageUploadField

const STEPS = [
    { id: 1, title: 'Account', subtitle: 'Your login credentials' },
    { id: 2, title: 'Restaurant', subtitle: 'Business information' },
    { id: 3, title: 'Documents', subtitle: 'Legal & compliance' },
];

const CUISINE_OPTIONS = [
    'North Indian', 'South Indian', 'Chinese', 'Italian', 'Mexican',
    'Thai', 'Japanese', 'Continental', 'Fast Food', 'Street Food',
    'Desserts', 'Beverages', 'Biryani', 'Pizza', 'Burger'
];

export default function RestaurantSignUp() {
    const navigate = useNavigate();
    const { signIn } = useAuthStore();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const [form, setForm] = useState({
        // Step 1 — Account
        ownerName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        // Step 2 — Restaurant
        restaurantName: '',
        description: '',
        cuisines: [],
        address: '',
        city: '',
        state: '',
        zipCode: '',
        restaurantBanner: '', // image upload
        // Step 3 — Documents
        fssaiLicense: '',
        fssaiImage: '',     // image upload
        gstin: '',
        panNumber: '',
        panImage: '',       // image upload
        bankAccountName: '',
        bankAccountNumber: '',
        bankIfsc: '',
        bankName: '',
    });

    const handleImageChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const toggleCuisine = (c) => {
        setForm(prev => ({
            ...prev,
            cuisines: prev.cuisines.includes(c)
                ? prev.cuisines.filter(x => x !== c)
                : [...prev.cuisines, c]
        }));
    };

    // ── Validation ────────────────────────────────────────────────
    const validateStep = () => {
        setError('');
        if (step === 1) {
            if (!form.ownerName.trim()) return setError('Owner name is required'), false;
            if (!form.email.trim()) return setError('Email is required'), false;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Enter a valid email'), false;
            if (!form.phone.trim()) return setError('Phone number is required'), false;
            if (form.password.length < 6) return setError('Password must be at least 6 characters'), false;
            if (form.password !== form.confirmPassword) return setError('Passwords do not match'), false;
        }
        if (step === 2) {
            if (!form.restaurantName.trim()) return setError('Restaurant name is required'), false;
            if (form.cuisines.length === 0) return setError('Select at least one cuisine'), false;
            if (!form.address.trim()) return setError('Address is required'), false;
            if (!form.city.trim()) return setError('City is required'), false;
        }
        if (step === 3) {
            if (!form.fssaiLicense.trim()) return setError('FSSAI License number is required'), false;
            if (!form.fssaiImage) return setError('Please upload your FSSAI License certificate image.'), false;
            if (!form.panNumber.trim()) return setError('PAN number is required'), false;
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep()) setStep(s => Math.min(s + 1, 3));
    };

    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    // ── Submit ────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep()) return;
        setLoading(true);
        setError('');

        try {
            // Register the user with restaurant role
            const res = await API.post('/auth/register', {
                name: form.ownerName,
                email: form.email,
                password: form.password,
                role: 'restaurant',
            });

            // Auto-login after registration
            const loggedIn = await signIn({ email: form.email, password: form.password });

            // Now create the restaurant linked to this owner
            await API.post('/restaurants', {
                owner: loggedIn._id,
                name: form.restaurantName,
                description: form.description,
                cuisines: form.cuisines,
                fssaiLicense: form.fssaiLicense,
                gstin: form.gstin,
                panNumber: form.panNumber,
                bankDetails: {
                    accountName: form.bankAccountName,
                    accountNumber: form.bankAccountNumber,
                    ifscCode: form.bankIfsc,
                    bankName: form.bankName,
                },
                location: {
                    address: form.address,
                    city: form.city,
                    state: form.state,
                    zipCode: form.zipCode,
                    // Auto-assign coordinates near Tenali for demo purposes
                    latitude: 16.2367 + (Math.random() * 0.005),
                    longitude: 80.6475 + (Math.random() * 0.005),
                },
            });

            setSuccess(true);
            setTimeout(() => navigate('/partner'), 2500);
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    // ── Success Screen ────────────────────────────────────────────
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] font-sans px-4">
                <div className="text-center bg-white p-16 rounded-[3rem] shadow-sm border border-slate-100 max-w-md w-full">
                    <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <CheckCircle size={40} className="text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Welcome Aboard! 🎉</h1>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-2">Your restaurant is being set up</p>
                    <p className="text-slate-500 text-sm mt-4 leading-relaxed">Your partner account has been created successfully. Redirecting to your dashboard...</p>
                    <div className="mt-8 w-full bg-emerald-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: '80%' }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-[#F8F9FB] font-sans">

            {/* ── Left Panel ── */}
            <div className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between p-12 relative overflow-hidden bg-emerald-950">
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 bg-emerald-500" />
                <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-10 bg-amber-500" />

                <div className="relative z-10">
                    <Link to="/" className="flex items-center gap-2 mb-16">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-emerald-600">
                            <span className="text-white font-black text-sm">FC</span>
                        </div>
                        <span className="text-xl font-black text-white tracking-tight">Food<span className="text-emerald-400">Court</span></span>
                    </Link>

                    <h2 className="text-white text-4xl font-black tracking-tight mb-4 leading-tight">
                        Grow your <span className="text-emerald-400">restaurant</span> business
                    </h2>
                    <p className="text-slate-400 font-medium leading-relaxed text-sm">
                        Join 1,200+ restaurant partners on FoodCourt. Reach millions of customers and boost your revenue.
                    </p>

                    {/* Steps indicator */}
                    <div className="mt-12 space-y-4">
                        {STEPS.map((s) => (
                            <div key={s.id} className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${step === s.id ? 'bg-white/10 border border-white/10' : step > s.id ? 'opacity-60' : 'opacity-30'}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all ${step > s.id ? 'bg-emerald-500 text-white' : step === s.id ? 'bg-white text-emerald-900' : 'bg-white/10 text-white/50'}`}>
                                    {step > s.id ? <CheckCircle size={18} /> : s.id}
                                </div>
                                <div>
                                    <p className="text-white font-black text-sm">{s.title}</p>
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{s.subtitle}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Documents checklist */}
                <div className="relative z-10 mt-8 p-6 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10">
                    <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-4">📋 Keep These Handy</p>
                    <div className="space-y-2.5">
                        {[
                            { label: 'FSSAI License copy', icon: Shield },
                            { label: 'Restaurant Menu', icon: UtensilsCrossed },
                            { label: 'Bank Account Details', icon: Landmark },
                            { label: 'GSTIN Certificate', icon: Receipt },
                            { label: 'PAN Card copy', icon: CreditCard },
                        ].map(({ label, icon: Icon }) => (
                            <div key={label} className="flex items-center gap-3">
                                <Icon size={14} className="text-emerald-500 shrink-0" />
                                <span className="text-white/70 text-xs font-bold">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Right Panel (Form) ── */}
            <div className="flex-1 flex items-start justify-center px-6 py-12 overflow-y-auto">
                <div className="w-full max-w-lg">

                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-2 mb-8">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-emerald-600">
                            <span className="text-white font-black text-sm">FC</span>
                        </div>
                        <span className="text-2xl font-black text-slate-900 tracking-tight">Food<span className="text-orange-500">Court</span></span>
                    </div>

                    {/* Mobile step indicator */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        {STEPS.map(s => (
                            <div key={s.id} className="flex-1">
                                <div className={`h-1.5 rounded-full transition-all ${step >= s.id ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                <p className={`text-[9px] font-black uppercase tracking-widest mt-1.5 ${step === s.id ? 'text-emerald-600' : 'text-slate-300'}`}>{s.title}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                            {step === 1 && 'Create Partner Account'}
                            {step === 2 && 'Restaurant Details'}
                            {step === 3 && 'Business Documents'}
                        </h1>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            Step {step} of 3 — {STEPS[step - 1].subtitle}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl mb-6 font-bold text-xs uppercase tracking-wide flex items-center gap-3 animate-shake">
                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" /> {error}
                        </div>
                    )}

                    <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>

                        {/* ═══════════ STEP 1: Account ═══════════ */}
                        {step === 1 && (
                            <div className="animate-fade-up">
                                <div className="space-y-5">
                                    {/* Owner Name */}
                                    <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Owner Full Name</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                        <input
                                            type="text" value={form.ownerName} onChange={e => update('ownerName', e.target.value)}
                                            placeholder="Rajesh Kumar"
                                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Business Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                        <input
                                            type="email" value={form.email} onChange={e => update('email', e.target.value)}
                                            placeholder="contact@myrestaurant.com"
                                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Phone Number</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                        <input
                                            type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                                            placeholder="+91 98765 43210"
                                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Create Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                        <input
                                            type={showPass ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)}
                                            placeholder="Min 6 characters"
                                            className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                        />
                                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Confirm Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                        <input
                                            type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)}
                                            placeholder="Re-enter password"
                                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="relative py-6">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                                <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Or continue with</span></div>
                            </div>

                            <div className="flex justify-center">
                                <GoogleLogin
                                    onSuccess={(response) => {
                                        useAuthStore.getState().googleAuth(response.credential, 'restaurant')
                                            .then((user) => {
                                                setForm(prev => ({ ...prev, ownerName: user.name || '', email: user.email || '' }));
                                                setStep(2);
                                            })
                                            .catch((err) => setError(err.message));
                                    }}
                                    onError={() => setError('Google Authentication Failed')}
                                    shape="pill"
                                    theme="outline"
                                    text="signup_with"
                                    width="400"
                                />
                            </div>
                        </div>
                    )}

                        {/* ═══════════ STEP 2: Restaurant ═══════════ */}
                        {step === 2 && (
                            <div className="space-y-5">
                                {/* Restaurant Name */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Restaurant Name</label>
                                    <div className="relative group">
                                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                        <input
                                            type="text" value={form.restaurantName} onChange={e => update('restaurantName', e.target.value)}
                                            placeholder="The Grand Kitchen"
                                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Restaurant Description</label>
                                    <textarea
                                        value={form.description} onChange={e => update('description', e.target.value)}
                                        placeholder="Tell customers about your restaurant..."
                                        rows={3}
                                        className="w-full px-4 py-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm resize-none"
                                    />
                                </div>

                                {/* Cuisines */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Cuisines Offered</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CUISINE_OPTIONS.map(c => (
                                            <button
                                                key={c} type="button" onClick={() => toggleCuisine(c)}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${form.cuisines.includes(c)
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm'
                                                    : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Restaurant Address</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-4 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                        <textarea
                                            value={form.address} onChange={e => update('address', e.target.value)}
                                            placeholder="Full street address"
                                            rows={2}
                                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm resize-none"
                                        />
                                    </div>
                                </div>

                                {/* City & State */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">City</label>
                                        <input
                                            type="text" value={form.city} onChange={e => update('city', e.target.value)}
                                            placeholder="Mumbai"
                                            className="w-full px-4 py-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">State</label>
                                        <input
                                            type="text" value={form.state} onChange={e => update('state', e.target.value)}
                                            placeholder="Maharashtra"
                                            className="w-full px-4 py-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* ZIP */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">PIN Code</label>
                                    <input
                                        type="text" value={form.zipCode} onChange={e => update('zipCode', e.target.value)}
                                        placeholder="400001"
                                        className="w-full px-4 py-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                    />
                                </div>

                                <ImageUploadField
                                    label="Restaurant Banner Image"
                                    value={form.restaurantBanner}
                                    onChange={(url) => update('restaurantBanner', url)}
                                    icon={Store}
                                    required
                                    hint="Upload a high-quality banner of your restaurant"
                                />
                            </div>
                        )}

                        {/* ═══════════ STEP 3: Documents ═══════════ */}
                        {step === 3 && (
                            <div className="space-y-6">

                                {/* FSSAI License */}
                                <div className="p-5 bg-amber-50/50 rounded-[2rem] border border-amber-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                            <Shield size={20} className="text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-sm">FSSAI License <span className="text-rose-500">*</span></p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Food Safety & Standards Authority of India</p>
                                        </div>
                                    </div>
                                    <input
                                        type="text" value={form.fssaiLicense} onChange={e => update('fssaiLicense', e.target.value)}
                                        placeholder="14-digit FSSAI License Number"
                                        className="w-full px-4 py-3.5 rounded-xl bg-white border border-amber-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                    />
                                    <ImageUploadField
                                        label="FSSAI License Image"
                                        value={form.fssaiImage}
                                        onChange={(url) => update('fssaiImage', url)}
                                        icon={Shield}
                                        required
                                        hint="Clear photo of FSSAI Certificate"
                                    />
                                    <a href="https://foscos.fssai.gov.in" target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-3 text-[9px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors">
                                        Don't have one? Apply Here →
                                    </a>
                                </div>

                                {/* GSTIN */}
                                <div className="p-5 bg-blue-50/50 rounded-[2rem] border border-blue-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                            <Receipt size={20} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-sm">GSTIN</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Goods & Services Tax ID (Optional)</p>
                                        </div>
                                    </div>
                                    <input
                                        type="text" value={form.gstin} onChange={e => update('gstin', e.target.value.toUpperCase())}
                                        placeholder="22AAAAA0000A1Z5"
                                        maxLength={15}
                                        className="w-full px-4 py-3.5 rounded-xl bg-white border border-blue-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm uppercase"
                                    />
                                    <a href="https://www.gst.gov.in/registration/new" target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-3 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors">
                                        Don't have GSTIN? Apply Here →
                                    </a>
                                </div>

                                {/* PAN Card */}
                                <div className="p-5 bg-purple-50/50 rounded-[2rem] border border-purple-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                            <CreditCard size={20} className="text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-sm">PAN Card <span className="text-rose-500">*</span></p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Permanent Account Number</p>
                                        </div>
                                    </div>
                                    <input
                                        type="text" value={form.panNumber} onChange={e => update('panNumber', e.target.value.toUpperCase())}
                                        placeholder="ABCDE1234F"
                                        maxLength={10}
                                        className="w-full px-4 py-3.5 rounded-xl bg-white border border-purple-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm uppercase"
                                    />
                                    <ImageUploadField
                                        label="PAN Card Image"
                                        value={form.panImage}
                                        onChange={(url) => update('panImage', url)}
                                        icon={CreditCard}
                                        required
                                        hint="Clear photo of Business/Owner PAN"
                                    />
                                </div>

                                {/* Bank Details */}
                                <div className="p-5 bg-emerald-50/50 rounded-[2rem] border border-emerald-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                            <Landmark size={20} className="text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-sm">Bank Account Details</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">For payment settlements</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <input
                                            type="text" value={form.bankAccountName} onChange={e => update('bankAccountName', e.target.value)}
                                            placeholder="Account Holder Name"
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-emerald-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                        />
                                        <input
                                            type="text" value={form.bankAccountNumber} onChange={e => update('bankAccountNumber', e.target.value)}
                                            placeholder="Account Number"
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-emerald-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="text" value={form.bankIfsc} onChange={e => update('bankIfsc', e.target.value.toUpperCase())}
                                                placeholder="IFSC Code"
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-emerald-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm uppercase"
                                            />
                                            <input
                                                type="text" value={form.bankName} onChange={e => update('bankName', e.target.value)}
                                                placeholder="Bank Name"
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-emerald-200 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Upload Info */}
                                <div className="p-5 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                            <UtensilsCrossed size={20} className="text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-sm">Restaurant Menu</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">You can add menu items from the dashboard</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-500 text-xs font-medium leading-relaxed">
                                        After registration, you'll be able to add individual menu items with photos, prices, and categories from your Partner Dashboard.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ── Navigation Buttons ── */}
                        <div className="flex items-center justify-between mt-10 gap-4">
                            {step > 1 ? (
                                <button type="button" onClick={prevStep}
                                    className="flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
                                    <ArrowLeft size={16} /> Back
                                </button>
                            ) : (
                                <div />
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : step < 3 ? (
                                    <>Continue <ArrowRight size={16} /></>
                                ) : (
                                    <>Submit Application <CheckCircle size={16} /></>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Sign In Link */}
                    <div className="mt-10 text-center">
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                            Already a partner?{' '}
                            <Link to="/restaurant/login" className="text-emerald-500 hover:underline ml-1">
                                Sign In →
                            </Link>
                        </p>
                    </div>

                    {/* Other Portals */}
                    <div className="mt-6 pt-6 border-t border-slate-100 flex justify-center gap-6">
                        <Link to="/signin" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-500 transition-colors">
                            Customer
                        </Link>
                        <Link to="/admin/login" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-purple-600 transition-colors">
                            Admin
                        </Link>
                        <Link to="/rider/login" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">
                            Rider
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
