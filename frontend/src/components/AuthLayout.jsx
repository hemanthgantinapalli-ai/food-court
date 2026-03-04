import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Github, Chrome } from 'lucide-react';

const AuthLayout = ({ children, title, subtitle, footerLink, footerText, footerAction, role, onFooterClick }) => {
    return (
        <div className="min-h-screen w-full flex bg-[#F8FAFC] font-sans">
            {/* Left: Branding & Decoration */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12">
                {/* Abstract Background Shapes */}
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-orange-600/20 blur-[100px]" />

                <div className="relative z-10 max-w-md text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-500 to-orange-400 shadow-2xl shadow-orange-500/20 mb-10 animate-float">
                        <span className="text-white text-3xl font-black italic tracking-tighter leading-none">A</span>
                    </div>

                    <h2 className="text-white text-5xl font-black tracking-tight mb-6 leading-[1.1]">
                        Experience the <span className="text-orange-500 italic">Future</span> of Dining.
                    </h2>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">
                        Join Academy today and discover a world of culinary delights tailored just for you.
                    </p>

                    <div className="mt-12 flex items-center justify-center gap-6">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="user" />
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
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Academy Platform v1.0</span>
                </div>
            </div>

            {/* Right: Actual Form Section */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
                <div className="w-full max-w-[440px] animate-fade-up">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
                            <span className="text-white font-black italic text-xl">A</span>
                        </div>
                    </div>

                    {/* Logo Title (Requested: Academy) */}
                    <div className="mb-10 text-center lg:text-left">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Academy</h3>
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
                                <button type="button" onClick={onFooterClick} className="text-orange-500 hover:text-orange-600 transition-colors ml-1 underline decoration-2 underline-offset-4">
                                    {footerAction || 'Sign Up'}
                                </button>
                            ) : (
                                <Link to={footerLink || '/signup'} className="text-orange-500 hover:text-orange-600 transition-colors ml-1 underline decoration-2 underline-offset-4">
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
