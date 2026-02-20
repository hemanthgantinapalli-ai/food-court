import React from 'react';
import { Mail, Phone, MapPin, Edit2, LogOut, Package, CreditCard } from 'lucide-react';
import { useAuthStore } from '../context/authStore';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-50/50 py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-600 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-xl">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                Hello, <span className="text-orange-600">{user?.firstName || 'Gourmet'}</span>
              </h1>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Elite Member Since 2026</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-50 transition-all">
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Details */}
          <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900">Personal Info</h3>
              <Edit2 size={18} className="text-slate-300 cursor-pointer hover:text-orange-500" />
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Mail size={18}/></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                  <p className="font-bold text-slate-900">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Phone size={18}/></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                  <p className="font-bold text-slate-900">{user?.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet / Credits */}
          <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
             <div className="relative z-10">
              <h3 className="text-xl font-black mb-2">FoodCourt Credit</h3>
              <p className="text-5xl font-black text-orange-500 tracking-tighter mb-8">₹{user?.wallet?.balance || '0.00'}</p>
              <button className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                Add Funds
              </button>
             </div>
             <CreditCard className="absolute -bottom-4 -right-4 text-white/5 w-40 h-40 -rotate-12" />
          </div>
        </div>

        {/* Saved Addresses */}
        <div className="mt-8 bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-black text-slate-900 mb-8">Delivery Addresses</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {user?.addresses?.map((addr, i) => (
              <div key={i} className="p-6 rounded-[2rem] border-2 border-slate-50 bg-slate-50/30 flex items-start gap-4">
                <MapPin className="text-orange-500 mt-1" size={20} />
                <div>
                  <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{addr.label || 'Home'}</p>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                    {addr.street}, {addr.city}<br/>{addr.zipCode}
                  </p>
                </div>
              </div>
            ))}
            <button className="p-6 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 font-black text-xs uppercase tracking-widest hover:border-orange-500 hover:text-orange-500 transition-all">
              + Add New Address
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}