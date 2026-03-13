import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Edit2, LogOut, Package, CreditCard, Save, X, LayoutDashboard, Bike, Store, ShieldCheck, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import API from '../api/axios';
import AddressManagerModal from '../components/AddressManagerModal';

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuthStore();

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({ name: user?.name || user?.firstName || '', phone: user?.phone || '' });

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState(null);

  const [roleStats, setRoleStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const [supportForm, setSupportForm] = useState({ subject: 'Document Update Request', message: '', priority: 'high' });
  const [supportMessage, setSupportMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setInfoForm({ name: user.name || user.firstName || '', phone: user.phone || '' });
      fetchRoleStats();
    }
  }, [user]);

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSupport(true);
    setSupportMessage({ text: '', type: '' });
    try {
      await API.post('/support/create', supportForm);
      setSupportMessage({ text: '✨ Request submitted! Admin will contact you soon.', type: 'success' });
      setTimeout(() => {
        setShowSupportModal(false);
        setSupportMessage({ text: '', type: '' });
        setSupportForm({ subject: 'Document Update Request', message: '', priority: 'high' });
      }, 3000);
    } catch (error) {
      setSupportMessage({ text: '❌ Failed to submit request. Try again.', type: 'error' });
    } finally {
      setSubmittingSupport(false);
    }
  };

  const fetchRoleStats = async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      let endpoint = '';
      if (user.role === 'admin') endpoint = '/admin/stats';
      else if (user.role === 'customer') endpoint = '/auth/stats';
      else if (user.role === 'rider') endpoint = '/riders/stats';
      else if (user.role === 'restaurant') endpoint = '/partner/stats';

      if (endpoint) {
        const response = await API.get(endpoint);
        setRoleStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch role-specific stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSaveInfo = async () => {
    try {
      await updateProfile({ name: infoForm.name, phone: infoForm.phone });
      setIsEditingInfo(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleEditAddress = (index) => {
    setEditingAddressIndex(index);
    setIsAddressModalOpen(true);
  };

  const handleDeleteAddress = async (index) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      const updatedAddresses = user.addresses.filter((_, i) => i !== index);
      await updateProfile({ addresses: updatedAddresses });
    } catch (error) {
      console.error('Failed to delete address:', error);
    }
  };

  const displayName = user?.name?.split(' ')?.[0] || user?.firstName || 'Guest';
  const initial = user?.name?.[0] || user?.firstName?.[0] || 'U';

  return (
    <div className="min-h-screen bg-slate-50/50 py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-600 rounded-[2rem] overflow-hidden flex items-center justify-center shadow-xl border-4 border-white">
              {user?.role === 'rider' && user?.riderData?.profilePhoto ? (
                <img src={user.riderData.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-4xl font-black uppercase">{initial}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                  Hello, <span className="text-orange-600">{displayName}</span>
                </h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user?.role === 'admin' ? 'bg-purple-100 text-purple-600' : user?.role === 'rider' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                  {user?.role || 'Member'}
                </span>
              </div>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Elite {user?.role || 'Member'} Since 2026</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            {user?.role === 'admin' && (
              <Link to="/admin" className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg active:scale-[0.98]">
                <LayoutDashboard size={16} /> Admin Console
              </Link>
            )}

            {(user?.role === 'rider' || user?.role === 'restaurant' || user?.role === 'admin') && (
              <Link to={`/${user.role === 'restaurant' ? 'partner' : user.role === 'rider' ? 'rider' : 'admin'}`} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-[0.98]">
                <LayoutDashboard size={16} /> Back to Dashboard
              </Link>
            )}
            <button onClick={logout} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm active:scale-[0.98]">
              <LogOut size={16} /> Sign Out
            </button>
          </div>

        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Personal Info Card */}
          <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-900">Personal Account</h3>
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
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Mail size={20} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                    <p className="font-bold text-slate-900">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Phone size={20} /></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Phone</p>
                    {isEditingInfo ? (
                      <input type="text" value={infoForm.phone} onChange={e => setInfoForm({ ...infoForm, phone: e.target.value })} placeholder="Phone number" className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-orange-500" />
                    ) : (
                      <p className="font-bold text-slate-900">{user?.phone || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Role-Specific Metric Card */}
          {user?.role === 'admin' ? (
            <div className="bg-purple-900 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-purple-200 relative overflow-hidden">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black mb-6">Platform Control</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-black text-purple-300 uppercase tracking-[0.2em] mb-1">Users</p>
                      <p className="text-3xl font-black">{roleStats?.totalUsers || '...'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-purple-300 uppercase tracking-[0.2em] mb-1">Orders</p>
                      <p className="text-3xl font-black">{roleStats?.totalOrders || '...'}</p>
                    </div>
                    <div className="mt-4">
                      <p className="text-[10px] font-black text-purple-300 uppercase tracking-[0.2em] mb-1">Revenue</p>
                      <p className="text-xl font-black text-emerald-400">₹{roleStats?.totalRevenue?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </div>
                <Link to="/admin" className="mt-8 w-full bg-white text-purple-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                  <LayoutDashboard size={14} /> Open Admin Panel
                </Link>
              </div>
              <ShieldCheck className="absolute -bottom-4 -right-4 text-white/5 w-48 h-48" />
            </div>
          ) : user?.role === 'rider' ? (
            <div className="bg-indigo-900 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black mb-6">Delivery Career</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                      <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Avg Rating</p>
                      <p className="text-2xl font-black text-emerald-400">{roleStats?.rating || 4.5} ★</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                      <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Earnings</p>
                      <p className="text-2xl font-black">₹{roleStats?.totalEarnings || 0}</p>
                    </div>
                  </div>
                </div>
                <Link to="/rider" className="mt-8 w-full bg-indigo-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-950 flex items-center justify-center gap-2">
                  <Bike size={14} /> View Deliveries
                </Link>
              </div>
              <Bike className="absolute -bottom-4 -right-4 text-white/5 w-48 h-48" />
            </div>
          ) : user?.role === 'restaurant' ? (
            <div className="bg-emerald-900 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-200 relative overflow-hidden">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black mb-6">Partner Dashboard</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div>
                        <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest mb-0.5">Total Revenue</p>
                        <p className="text-2xl font-black">₹{roleStats?.grossRevenue?.toLocaleString() || 0}</p>
                      </div>
                      <Store className="text-emerald-400" size={24} />
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                      <div>
                        <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest mb-0.5">Orders</p>
                        <p className="text-2xl font-black">{roleStats?.totalOrders || 0}</p>
                      </div>
                      <Package className="text-emerald-400" size={24} />
                    </div>
                  </div>
                </div>
                <Link to="/partner" className="mt-8 w-full bg-emerald-50 text-emerald-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 hover:bg-white">
                  <LayoutDashboard size={14} /> Open Partner Portal
                </Link>
              </div>
              <Store className="absolute -bottom-4 -right-4 text-white/5 w-48 h-48" />
            </div>
          ) : (
            <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black mb-2">FoodCourt Credit</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Available for checkout</p>
                  <p className="text-6xl font-black text-orange-500 tracking-tighter mb-8">₹{user?.wallet?.balance || '0.00'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Orders</p>
                    <p className="text-xl font-black">{roleStats?.totalOrders || 0}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Spent</p>
                    <p className="text-xl font-black">₹{roleStats?.totalSpent || 0}</p>
                  </div>
                </div>
              </div>
              <CreditCard className="absolute -bottom-4 -right-4 text-white/5 w-48 h-48 -rotate-12" />
            </div>
          )}
        </div>

        {/* Business Documents / Verification Details (Visible for Riders & Partners) */}
        {(user?.role === 'rider' || user?.role === 'restaurant') && (
          <div className="mt-8 bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <ShieldCheck className="text-emerald-500" /> Professional Identity
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {user?.role === 'rider' && (
                <>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vehicle Details</p>
                    <p className="font-black text-slate-900 uppercase">{user?.riderData?.vehicleType || 'Bike'} • {user?.riderData?.vehicleNumber || 'N/A'}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">DL Number</p>
                    <p className="font-black text-slate-900 uppercase">{user?.riderData?.licenseNumber || 'N/A'}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Aadhaar (Masked)</p>
                    <p className="font-black text-slate-900">XXXX XXXX {user?.riderData?.aadhaarDetails?.aadhaarNumber?.slice(-4) || 'XXXX'}</p>
                  </div>
                </>
              )}

              {user?.role === 'restaurant' && (
                <>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Business Name</p>
                    <p className="font-black text-slate-900">{user?.restaurants?.[0]?.name || 'Partner Account'}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Branches</p>
                    <p className="font-black text-slate-900">{user?.restaurants?.length || 0} Managed</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">FSSAI Status</p>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      <CheckCircle size={10} /> Certified
                    </span>
                  </div>
                </>
              )}
            </div>

            {user?.role === 'restaurant' && user?.restaurants?.length > 0 && (
              <div className="mt-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Your Restaurants</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {user.restaurants.map((rest, i) => (
                    <div key={i} className="flex justify-between items-center p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:bg-emerald-50 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl overflow-hidden shadow-sm border border-slate-50 flex items-center justify-center">
                          {rest.image ? <img src={rest.image} alt="" className="w-full h-full object-cover" /> : <Store className="text-slate-200" size={18} />}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-xs">{rest.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{rest.location?.city || 'Global'}</p>
                        </div>
                      </div>
                      <Link to="/partner" className="p-2 text-emerald-600 opacity-0 group-hover:opacity-100 hover:scale-110 transition-all"><LayoutDashboard size={14} /></Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-center justify-between">
              <div>
                <p className="font-black text-indigo-900 text-sm">Need to update your professional documents?</p>
                <p className="text-indigo-400 text-xs font-bold mt-1">Contact admin support for sensitive information changes (Aadhaar, DL, Bank).</p>
              </div>
              <button
                onClick={() => setShowSupportModal(true)}
                className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all font-sans"
              >
                Support Req
              </button>
            </div>
          </div>
        )}

        {/* Support Request Modal */}
        {showSupportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6 overflow-y-auto">
            <div className="bg-white rounded-[3rem] p-10 max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-300 relative">
              <button
                onClick={() => setShowSupportModal(false)}
                className="absolute top-8 right-8 p-4 bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-100 transition-all hover:rotate-90"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center mb-10 text-center">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mb-4">
                  <ShieldCheck size={36} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Professional Support</h3>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Document Updates & Verifications</p>
              </div>

              {supportMessage.text && (
                <div className={`mb-8 p-4 rounded-2xl text-center font-bold text-sm ${supportMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}>
                  {supportMessage.text}
                </div>
              )}

              <form onSubmit={handleSupportSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Subject</label>
                  <input
                    readOnly
                    className="w-full bg-slate-50 border border-slate-100 py-4 px-6 rounded-2xl font-bold text-slate-500 outline-none"
                    value={supportForm.subject}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Write your request</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-100 py-4 px-6 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                    placeholder="Explain what needs updating (e.g., I want to change my vehicle number to GJ01...)"
                    value={supportForm.message}
                    onChange={e => setSupportForm({ ...supportForm, message: e.target.value })}
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowSupportModal(false)}
                    className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all font-sans"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSupport}
                    className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all font-sans shadow-xl shadow-indigo-100 disabled:opacity-50"
                  >
                    {submittingSupport ? 'Sending...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="mt-8 bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-black text-slate-900 mb-8">Delivery Addresses</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {user?.addresses?.map((addr, i) => (
                <div key={i} className="group p-6 rounded-[2rem] border-2 border-slate-50 bg-slate-50/30 flex items-start justify-between gap-4 hover:border-orange-200 hover:bg-white transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <MapPin className="text-orange-500 mt-1 shrink-0" size={20} />
                    <div>
                      <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{addr.label || 'Home'}</p>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                        {addr.street}, {addr.area ? `${addr.area}, ` : ''}{addr.city} <br /> {addr.zipCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleEditAddress(i)} className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-orange-500 hover:scale-110 transition-all">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDeleteAddress(i)} className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-rose-500 hover:scale-110 transition-all">
                      <X size={14} />
                    </button>
                  </div>
                </div>
            ))}

            <button 
              onClick={() => {
                setEditingAddressIndex(null);
                setIsAddressModalOpen(true);
              }} 
              className="p-6 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3 hover:border-orange-500 hover:bg-orange-50/30 hover:text-orange-500 transition-all duration-300 min-h-[160px]"
            >
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-orange-100">
                <MapPin size={18} />
              </div>
              <span className="font-black text-[10px] uppercase tracking-widest">+ Add New Address</span>
            </button>
          </div>
        </div>

        {/* Address Manager Modal Overlay */}
        <AddressManagerModal 
          isOpen={isAddressModalOpen} 
          onClose={() => setIsAddressModalOpen(false)} 
          existingAddress={editingAddressIndex !== null ? user?.addresses?.[editingAddressIndex] : null}
          indexToEdit={editingAddressIndex}
        />

      </div>
    </div>
  );
}