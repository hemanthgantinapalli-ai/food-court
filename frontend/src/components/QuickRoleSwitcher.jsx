import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Bike, User as UserIcon, Zap, Store } from 'lucide-react';
import { useAuthStore } from '../context/authStore';

export default function QuickRoleSwitcher() {
    const { user, logout, signIn } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const EXCLUDED_PATHS = ['/signin', '/signup', '/admin/login', '/rider/login', '/restaurant/login'];
    if (EXCLUDED_PATHS.includes(location.pathname)) return null;

    const roles = [
        { id: 'customer', label: 'U', icon: UserIcon, color: 'slate', login: '/signin' },
        { id: 'admin', label: 'A', icon: ShieldCheck, color: 'purple', login: '/admin/login' },
        { id: 'rider', label: 'R', icon: Bike, color: 'blue', login: '/rider/login' },
        { id: 'restaurant', label: 'P', icon: Store, color: 'emerald', login: '/restaurant/login' }
    ];

    const currentRole = user?.role || 'guest';
    const otherRoles = roles.filter(r => r.id !== currentRole);

    const handleSwitch = (role) => {
        // Navigate FIRST — if we logout() first, the ProtectedRoute on
        // the current page re-renders instantly and redirects us to
        // /admin/login before navigate() can fire.
        navigate(role.login, { replace: true });
        // Clear auth state after navigation is queued
        setTimeout(() => logout(), 100);
    };

    return (
        <div className="hidden md:flex fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
            {otherRoles.map((r) => (
                <button
                    key={r.id}
                    onClick={() => handleSwitch(r)}
                    title={`Switch to ${r.id}`}
                    className="w-10 h-10 bg-white border border-slate-100 rounded-xl shadow-lg hover:shadow-orange-100 hover:border-orange-200 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center group"
                >
                    <r.icon size={18} className={`text-slate-400 group-hover:text-orange-500 transition-colors`} />
                </button>
            ))}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto my-1 opacity-50" />
            <div className="w-10 h-10 bg-slate-900 rounded-xl shadow-inner flex items-center justify-center">
                <Zap size={16} className="text-orange-500" />
            </div>
        </div>
    );
}
