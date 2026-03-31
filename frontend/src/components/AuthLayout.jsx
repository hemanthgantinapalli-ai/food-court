import React from 'react';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';

const THEMES = {
    orange: {
        primary: 'bg-orange-500',
        hover: 'hover:bg-orange-600',
        shadow: 'shadow-orange-500/20',
        text: 'text-orange-500',
        border: 'border-orange-500',
        accent: 'from-orange-500 to-orange-400',
        bgAccent: 'bg-orange-600/20'
    },
    purple: {
        primary: 'bg-purple-600',
        hover: 'hover:bg-purple-700',
        shadow: 'shadow-purple-600/20',
        text: 'text-purple-600',
        border: 'border-purple-600',
        accent: 'from-purple-600 to-indigo-600',
        bgAccent: 'bg-purple-600/20'
    },
    emerald: {
        primary: 'bg-emerald-600',
        hover: 'hover:bg-emerald-700',
        shadow: 'shadow-emerald-600/20',
        text: 'text-emerald-600',
        border: 'border-emerald-600',
        accent: 'from-emerald-600 to-teal-500',
        bgAccent: 'bg-emerald-600/20'
    },
    sky: {
        primary: 'bg-sky-600',
        hover: 'hover:bg-sky-700',
        shadow: 'shadow-sky-600/20',
        text: 'text-sky-600',
        border: 'border-sky-600',
        accent: 'from-sky-600 to-blue-500',
        bgAccent: 'bg-sky-600/20'
    }
};

const AuthLayout = ({ children, title, subtitle, footerLink, footerText, footerAction, theme = 'orange', onFooterClick }) => {
    const activeTheme = THEMES[theme] || THEMES.orange;

    return (
        <div className="min-h-screen w-full flex bg-[#F8FAFC] font-sans">
            {/* Left: Branding & Decoration */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12">
                {/* Abstract Background Shapes */}
                <div className={`absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] ${activeTheme.bgAccent}`} />
                <div className={`absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[100px] ${activeTheme.bgAccent}`} />

                <div className="relative z-10 max-w-md text-center">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr shadow-2xl mb-10 animate-float ${activeTheme.accent} ${activeTheme.shadow}`}>
                        <span className="text-white text-3xl font-black italic tracking-tighter leading-none">FC</span>
                    </div>

                    <h2 className="text-white text-5xl font-black tracking-tight mb-6 leading-[1.1]">
                        Experience the <span className={`${activeTheme.text} italic`}>Future</span> of Dining.
                    </h2>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">
                        Join FoodCourt today and discover a world of culinary delights tailored just for you.
                    </p>

                    <div className="mt-12 flex items-center justify-center gap-6">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                                    <img src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="user" />
                                </div>
                            ))}
                        </div>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">
                            Join 10k+ Members
                        </p>
                    </div>
                </div>

                {/* Branding badge */}
                <div className="absolute bottom-10 left-10 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${activeTheme.primary}`} />
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">FoodCourt Platform v1.2</span>
                </div>
            </div>

            {/* Right: Actual Form Section */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
                <div className="w-full max-w-[440px] animate-fade-up">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${activeTheme.primary} ${activeTheme.shadow}`}>
                            <span className="text-white font-black italic text-xl">FC</span>
                        </div>
                    </div>

                    {/* Logo Title */}
                    <div className="mb-10 text-center lg:text-left">
                        <div className="flex items-center gap-2 justify-center lg:justify-start mb-8">
                            <Globe size={18} className={activeTheme.text} />
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">FoodCourt</h3>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight mb-3">
                            {title || 'Welcome Back'}
                        </h1>
                        <p className="text-slate-500 font-medium text-base">
                            {subtitle || 'Hey, welcome back up to your special place'}
                        </p>
                    </div>

                    {/* Main Content (The Form) */}
                    <div className="space-y-6">
                        {children}
                    </div>

                    {/* Footer Info */}
                    <div className="mt-10 text-center">
                        <p className="text-slate-500 font-bold text-sm">
                            {footerText || "Don't have an account?"}{' '}
                            {onFooterClick ? (
                                <button type="button" onClick={onFooterClick} className={`${activeTheme.text} ${activeTheme.hover} transition-all ml-1 font-black uppercase text-[10px] tracking-widest underline decoration-2 underline-offset-4`}>
                                    {footerAction || 'Sign Up'}
                                </button>
                            ) : (
                                <Link to={footerLink || '/signup'} className={`${activeTheme.text} ${activeTheme.hover} transition-all ml-1 font-black uppercase text-[10px] tracking-widest underline decoration-2 underline-offset-4`}>
                                    {footerAction || 'Sign Up'}
                                </Link>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
