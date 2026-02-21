import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Edit2, LogOut, Package, CreditCard, Save, X } from 'lucide-react';
import { useAuthStore } from '../context/authStore';

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuthStore();

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({ name: user?.name || user?.firstName || '', phone: user?.phone || '' });

  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({ label: '', street: '', city: '', zipCode: '' });

  useEffect(() => {
    if (user) {
      setInfoForm({ name: user.name || user.firstName || '', phone: user.phone || '' });
    }
  }, [user]);

  const handleSaveInfo = async () => {
    try {
      await updateProfile({ name: infoForm.name, phone: infoForm.phone });
      setIsEditingInfo(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleAddAddress = async () => {
    if (!addressForm.street || !addressForm.city) return;
    try {
      const updatedAddresses = [...(user?.addresses || []), addressForm];
      await updateProfile({ addresses: updatedAddresses });
      setIsAddingAddress(false);
      setAddressForm({ label: '', street: '', city: '', zipCode: '' });
    } catch (error) {
      console.error('Failed to add address:', error);
    }
  };

  const displayName = user?.name?.split(' ')?.[0] || user?.firstName || 'Guest';
  const initial = user?.name?.[0] || user?.firstName?.[0] || 'U';

  return (
    <div className="min-h-screen bg-slate-50/50 py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-600 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-xl uppercase">
              {initial}
            </div>
            <div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                Hello, <span className="text-orange-600">{displayName}</span>
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
              {!isEditingInfo ? (
                <Edit2 size={18} className="text-slate-300 cursor-pointer hover:text-orange-500" onClick={() => setIsEditingInfo(true)} />
              ) : (
                <div className="flex space-x-2">
                  <X size={18} className="text-slate-300 cursor-pointer hover:text-rose-500" onClick={() => setIsEditingInfo(false)} />
                  <Save size={18} className="text-slate-300 cursor-pointer hover:text-emerald-500" onClick={handleSaveInfo} />
                </div>
              )}
            </div>

            <div className="space-y-6">
              {isEditingInfo && (
                <div className="flex flex-col gap-2 mb-4">
                  <input type="text" value={infoForm.name} onChange={e => setInfoForm({ ...infoForm, name: e.target.value })} placeholder="Full Name" className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-500" />
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Mail size={18} /></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                  <p className="font-bold text-slate-900">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Phone size={18} /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                  {isEditingInfo ? (
                    <input type="text" value={infoForm.phone} onChange={e => setInfoForm({ ...infoForm, phone: e.target.value })} placeholder="Phone number" className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-orange-500" />
                  ) : (
                    <p className="font-bold text-slate-900">{user?.phone || 'Not provided'}</p>
                  )}
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
                <MapPin className="text-orange-500 mt-1 shrink-0" size={20} />
                <div>
                  <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{addr.label || 'Home'}</p>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                    {addr.street}, {addr.city}<br />{addr.zipCode}
                  </p>
                </div>
              </div>
            ))}

            {isAddingAddress ? (
              <div className="p-6 rounded-[2rem] border-2 border-slate-200 flex flex-col gap-3">
                <input type="text" placeholder="Label (e.g., Home, Office)" value={addressForm.label} onChange={e => setAddressForm({ ...addressForm, label: e.target.value })} className="px-3 py-2 border rounded-xl text-sm outline-none focus:border-orange-500" />
                <input type="text" placeholder="Street Address" value={addressForm.street} onChange={e => setAddressForm({ ...addressForm, street: e.target.value })} className="px-3 py-2 border rounded-xl text-sm outline-none focus:border-orange-500" />
                <div className="flex gap-2">
                  <input type="text" placeholder="City" value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} className="w-1/2 px-3 py-2 border rounded-xl text-sm outline-none focus:border-orange-500" />
                  <input type="text" placeholder="Zip code" value={addressForm.zipCode} onChange={e => setAddressForm({ ...addressForm, zipCode: e.target.value })} className="w-1/2 px-3 py-2 border rounded-xl text-sm outline-none focus:border-orange-500" />
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setIsAddingAddress(false)} className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-100">Cancel</button>
                  <button onClick={handleAddAddress} className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-orange-500">Save</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setIsAddingAddress(true)} className="p-6 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 font-black text-xs uppercase tracking-widest hover:border-orange-500 hover:text-orange-500 transition-all min-h-[140px]">
                + Add New Address
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}