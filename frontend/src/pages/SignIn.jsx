import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Bike, User as UserIcon, CheckCircle2, Store } from 'lucide-react';
import { useAuthStore } from '../context/authStore';

const ROLES = [
  { id: 'customer', label: 'Customer', icon: UserIcon, color: 'orange', desc: 'Order delicious food', email: 'user@foodcourt.com', pass: 'user123' },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, color: 'purple', desc: 'Platform management', email: 'admin@foodcourt.com', pass: 'admin123' },
  { id: 'rider', label: 'Rider', icon: Bike, color: 'blue', desc: 'Deliver & Earn', email: 'rider@foodcourt.com', pass: 'rider123' }
];

export default function SignIn() {
  const [activeRole, setActiveRole] = useState('customer');
  const [email, setEmail] = useState(ROLES[0].email);
  const [password, setPassword] = useState(ROLES[0].pass);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam) {
      const roleObj = ROLES.find(r => r.id === roleParam);
      if (roleObj) {
        handleRoleSwitch(roleObj);
      }
    }
  }, [searchParams]);

  const handleRoleSwitch = (role) => {
    setActiveRole(role.id);
    if (role.email) {
      setEmail(role.email);
      setPassword(role.pass);
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await signIn({ email, password });

      // Verification log
      console.log(`🔐 [SignIn] Auth Success. Role: ${loggedInUser.role}`);

      if (loggedInUser.role === 'admin') navigate('/admin');
      else if (loggedInUser.role === 'rider') navigate('/rider');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Check the demo buttons above!');
    } finally {
      setLoading(false);
    }
  };

  const currentRoleConfig = ROLES.find(r => r.id === activeRole);

  return (
    <div className="min-h-screen flex bg-[#F8F9FB] font-sans">
      {/* Left: Dynamic Illustration Panel */}
      <div className={`hidden lg:flex w-1/2 items-center justify-center p-16 relative overflow-hidden transition-colors duration-700 ${activeRole === 'admin' ? 'bg-purple-950' : activeRole === 'rider' ? 'bg-blue-950' : 'bg-slate-900'
        }`}>
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 transition-colors duration-700 ${activeRole === 'admin' ? 'bg-purple-500' : activeRole === 'rider' ? 'bg-blue-500' : 'bg-orange-500'
          }`} />

        <div className="relative z-10 text-center max-w-lg">
          <div className="mb-12 inline-flex p-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <currentRoleConfig.icon size={80} className={`transition-colors duration-700 ${activeRole === 'admin' ? 'text-purple-400' : activeRole === 'rider' ? 'text-blue-400' : 'text-orange-400'
              }`} />
          </div>
          <h2 className="text-white text-5xl font-black tracking-tight mb-6 leading-tight">
            The <span className={activeRole === 'admin' ? 'text-purple-400' : activeRole === 'rider' ? 'text-blue-400' : 'text-orange-400'}>
              {currentRoleConfig.label}
            </span> Portal
          </h2>
          <p className="text-slate-400 text-xl font-medium leading-relaxed">
            {activeRole === 'admin'
              ? 'Complete control over the FoodCourt ecosystem, analytics, and partner approvals.'
              : activeRole === 'rider'
                ? 'Efficiently manage deliveries, track earnings, and navigate with ease.'
                : 'Discover the best cuisines and get them delivered to your doorstep in minutes.'}
          </p>

          <div className="mt-12 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-white text-2xl font-black">500k+</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Active Users</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <p className="text-white text-2xl font-black">10k+</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Global Partners</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Focused Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-12">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-700 ${activeRole === 'admin' ? 'bg-purple-600' : activeRole === 'rider' ? 'bg-blue-600' : 'bg-orange-600'
              }`}>
              <span className="text-white font-black text-sm">FC</span>
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tight">Food<span className="text-orange-500">Court</span></span>
          </Link>

          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Sign <span className={
              activeRole === 'admin' ? 'text-purple-600' : activeRole === 'rider' ? 'text-blue-600' : 'text-orange-600'
            }>In</span></h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Choose your access level to continue</p>
          </div>

          {/* New Role Switcher Design */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoleSwitch(r)}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 ${activeRole === r.id
                  ? `border-${r.color}-500 bg-${r.color}-50 text-${r.color}-600`
                  : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                  }`}
              >
                <r.icon size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest">{r.label}</span>
                {activeRole === r.id && <CheckCircle2 size={14} className="absolute top-2 right-2 mt-1 mr-1" />}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl mb-8 font-bold text-xs uppercase tracking-wide flex items-center gap-3 animate-shake">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Login Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                <input
                  type="email"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 ${activeRole === 'admin' ? 'bg-purple-600 shadow-purple-200 hover:bg-purple-700' :
                activeRole === 'rider' ? 'bg-blue-600 shadow-blue-200 hover:bg-blue-700' :
                  'bg-slate-900 shadow-slate-200 hover:bg-orange-600'
                }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Enter Digital Court <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="mt-10 text-center space-y-4">
          </div>

          {/* Debug/Creds Hint */}
          {activeRole && (
            <div className={`mt-10 p-4 rounded-2xl border border-dashed flex items-center gap-4 ${activeRole === 'admin' ? 'border-purple-200 bg-purple-50' :
              activeRole === 'rider' ? 'border-blue-200 bg-blue-50' :
                'border-orange-200 bg-orange-50'
              }`}>
              <ShieldCheck size={20} className={
                activeRole === 'admin' ? 'text-purple-500' :
                  activeRole === 'rider' ? 'text-blue-500' :
                    'text-orange-500'
              } />
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pre-filled Demo Credentials</p>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest line-clamp-1">{email} / {password}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
