import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Smartphone, Banknote, ChevronRight, CheckCircle, ArrowLeft, ShoppingBag, Lock, Wallet, Navigation, Edit2, Tag, X, Trash2, Save } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../context/authStore';
import { useOrderStore } from '../store/orderStore';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import API from '../api/axios';
import AddressManagerModal from '../components/AddressManagerModal';

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI / QR Code', icon: Smartphone, desc: 'Google Pay, PhonePe, Paytm' },
  { id: 'card', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, RuPay' },
  { id: 'wallet', label: 'FoodCourt Wallet', icon: Wallet, desc: 'Pay using your wallet balance' },
  { id: 'cod', label: 'Cash on Delivery', icon: Banknote, desc: 'Pay when you receive' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getTotal, discount, coupon, clearCart, getRestaurantId, applyCoupon } = useCartStore();
  const { user, getProfile } = useAuthStore();
  const { isLoaded: isGoogleLoaded } = useGoogleMaps();
  const { addOrder } = useOrderStore();

  const [restLocation, setRestLocation] = useState(null);

  // Always fetch fresh user profile so wallet balance is current (not stale from login)
  useEffect(() => {
    getProfile();
    
    // Fetch restaurant location for map routing
    const fetchRestLoc = async () => {
      const restId = getRestaurantId() || (items.length > 0 ? (items[0].restaurant?._id || items[0].restaurant) : null);
      if (restId) {
        try {
          const res = await API.get(`/restaurants/${restId}`);
          const restData = res.data.data.restaurant || res.data.data;
          if (restData.location?.latitude) {
            setRestLocation(restData.location);
          }
        } catch (e) {
          console.error("Failed to fetch restaurant location for checkout map", e);
        }
      }
    };
    fetchRestLoc();
  }, []);


  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [success, setSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');

  // ── Coupon ────────────────────────────────────────────────────
  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState(null); // { text, ok }
  const VALID_CODES = ['FIRST50', 'PIZZA40', 'FREEDEL', 'WEEKEND30', 'SUSHI25', 'COMBO199', 'FOODCOURT10', 'WELCOME20'];

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCouponMsg({ text: 'Please enter a coupon code.', ok: false }); return; }
    const result = applyCoupon(code);
    setCouponMsg({ text: result.message, ok: result.success });
    if (result.success) setCouponInput('');
  };

  const handleRemoveCoupon = () => {
    applyCoupon('__INVALID__CLEAR__');
    setCouponMsg(null);
    setCouponInput('');
  };
  // ─────────────────────────────────────────────────────────────

  const [address, setAddress] = useState({
    name: user?.name || user?.firstName || '',
    phone: user?.phone || '',
    street: '',
    area: '',
    city: '',
    pincode: '',
    landmark: '',
    lat: null,
    lng: null
  });
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const { updateProfile } = useAuthStore();
  const [errors, setErrors] = useState({});
  const [gpsCoords, setGpsCoords] = useState(null); // { latitude, longitude }
  const [gpsLoading, setGpsLoading] = useState(false);
  const [platformSettings, setPlatformSettings] = useState({ baseDeliveryFee: 30, perKmCharge: 10 });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await API.get('/admin/settings/public');
        if (res.data.success) {
          setPlatformSettings(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch platform settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleUseMyLocation = () => {
    if (!('geolocation' in navigator)) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setGpsCoords(coords);
        
        // Reverse geocode to fill address fields
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`);
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            setAddress(prev => ({
              ...prev,
              street: addr.road || addr.suburb || prev.street,
              area: addr.neighbourhood || addr.residential || addr.suburb || prev.area,
              city: addr.city || addr.town || addr.village || prev.city,
              pincode: addr.postcode || prev.pincode,
              lat: coords.latitude,
              lng: coords.longitude
            }));
          }
        } catch (err) {
          console.error("Auto-geocoding failed", err);
        }
        
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Distance calculation helper (Haversine Formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const distanceKm = (gpsCoords && restLocation) 
    ? calculateDistance(gpsCoords.latitude, gpsCoords.longitude, restLocation.latitude, restLocation.longitude)
    : null;

  const subtotal = getTotal();
  
  const calculateDynamicFee = (dist) => {
    if (subtotal === 0) return 0;
    if (dist === null) return 0; // Wait for location
    
    const base = platformSettings.baseDeliveryFee || 30;
    const perKm = platformSettings.perKmCharge || 10;
    
    if (dist <= 3) return base; // Min fee up to 3km
    return Math.round(base + (dist - 3) * perKm);
  };

  // Show base fee as placeholder if location not available, else calculate dynamically
  const deliveryFee = subtotal > 0 ? (distanceKm !== null ? calculateDynamicFee(distanceKm) : 30) : 0;
  const deliveryNote = distanceKm !== null ? `Distance: ${distanceKm.toFixed(1)}km` : 'Standard delivery fee';
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + deliveryFee + tax - (discount || 0);
  // Always read from live user state (getProfile refreshes this on mount)
  const walletBalance = user?.wallet?.balance ?? 0;

  const validate = () => {
    const e = {};
    if (!address.name.trim()) e.name = 'Full name is required';
    if (!address.phone.trim() || !/^\d{10}$/.test(address.phone.trim())) e.phone = 'Enter a valid 10-digit phone number';
    if (!address.street.trim()) e.street = 'Street address is required';
    if (!address.area.trim()) e.area = 'Area / locality is required';
    if (!address.city.trim()) e.city = 'City is required';
    if (!address.pincode.trim() || !/^\d{6}$/.test(address.pincode.trim())) e.pincode = 'Enter a valid 6-digit pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddressNext = (e) => {
    if (e) e.preventDefault();
    if (validate()) setStep(2);
  };

  const handleSaveAddress = async () => {
    if (!validate()) return;
    setSaveLoading(true);
    try {
      const newAddress = {
        label: address.label || address.landmark || 'Home',
        street: address.street,
        area: address.area,
        city: address.city,
        zipCode: address.pincode,
        landmark: address.landmark,
        lat: gpsCoords?.latitude || null,
        lng: gpsCoords?.longitude || null
      };
      
      const currentAddresses = user?.addresses || [];
      // Check if address already exists (simple string comparison for street)
      if (currentAddresses.find(a => a.street === newAddress.street && a.city === newAddress.city)) {
          setSaveLoading(false);
          return;
      }

      await updateProfile({
        addresses: [...currentAddresses, newAddress]
      });
      alert("Address saved to your profile!");
    } catch (err) {
      console.error("Save address failed:", err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteAddress = async (idx) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      const updatedAddresses = [...user.addresses];
      updatedAddresses.splice(idx, 1);
      await updateProfile({ addresses: updatedAddresses });
    } catch (err) {
      console.error("Delete address failed:", err);
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setOrderError('');

    // Re-fetch latest user profile to get current wallet balance before payment
    const freshUser = await getProfile();
    const currentWalletBalance = freshUser?.wallet?.balance ?? user?.wallet?.balance ?? 0;

    const normalizedPaymentMethod = paymentMethod === 'cod' ? 'cash' : paymentMethod;

    // Wallet balance check with fresh data
    if (normalizedPaymentMethod === 'wallet' && currentWalletBalance < total) {
      setOrderError(`Insufficient wallet balance. Your balance is ₹${currentWalletBalance}, but the order total is ₹${total.toFixed(0)}.`);
      setLoading(false);
      return;
    }
    const targetRestaurant = getRestaurantId() || (items.length > 0 ? (items[0].restaurant?._id || items[0].restaurant) : null) || null;

    if (!targetRestaurant) {
      setOrderError("Your cart items seem to have lost their restaurant. Please clear your cart and add items again.");
      setLoading(false);
      return;
    }

    const orderPayload = {
      restaurant: targetRestaurant,
      deliveryAddress: {
        street: address.street,
        area: address.area || '',
        city: address.city,
        state: address.state || '',
        zipCode: address.pincode,
        label: address.landmark || 'Home',
        // GPS coordinates for live map tracking
        latitude: gpsCoords?.latitude || null,
        longitude: gpsCoords?.longitude || null,
      },
      paymentMethod: normalizedPaymentMethod,
      items: items.map((i) => ({
        menuItem: i._id,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        addOns: i.addOns || [],
      })),
      subtotal,
      tax,
      deliveryFee,
      distance: distanceKm ? Number(distanceKm.toFixed(2)) : 0,
      discount,
      discountCode: coupon || '',
      total,
    };

    try {
      setOrderError('');
      await addOrder(orderPayload);
      clearCart();
      setLoading(false);
      setSuccess(true);
      setTimeout(() => navigate('/payment-success'), 1500);
    } catch (err) {
      console.error('Order create error:', err);
      setLoading(false);
      setOrderError(err.message || 'Failed to create order. Please try again.');
    }
  };


  const field = (name, placeholder, type = 'text', half = false) => (
    <div className={half ? 'flex-1' : 'w-full'}>
      <input
        type={type}
        placeholder={placeholder}
        value={address[name]}
        onChange={(e) => setAddress({ ...address, [name]: e.target.value })}
        className={`w-full px-4 py-3.5 rounded-xl border font-medium text-slate-900 outline-none transition-all text-sm
          ${errors[name] ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100'}`}
      />
      {errors[name] && <p className="text-red-500 text-xs mt-1 font-bold">{errors[name]}</p>}
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <div className="text-center animate-fade-up">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Order Placed! 🎉</h2>
          <p className="text-slate-400 font-medium">Redirecting to your order summary…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] py-10 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Back Button */}
        <button
          onClick={() => step === 1 ? navigate('/cart') : setStep(1)}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-orange-600 transition-colors font-bold text-sm mb-8"
        >
          <ArrowLeft size={16} />
          {step === 1 ? 'Back to Cart' : 'Back to Address'}
        </button>

        {/* Title */}
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
          Secure <span className="text-orange-500">Checkout</span>
        </h1>

        {/* Steps */}
        <div className="flex items-center gap-3 mb-10">
          {['Delivery Address', 'Payment'].map((label, i) => (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-2 text-sm font-black ${step === i + 1 ? 'text-orange-500' : step > i + 1 ? 'text-green-500' : 'text-slate-300'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 
                  ${step === i + 1 ? 'border-orange-500 bg-orange-50 text-orange-600' : step > i + 1 ? 'border-green-500 bg-green-50 text-green-600' : 'border-slate-200 text-slate-300'}`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                {label}
              </div>
              {i < 1 && <div className={`flex-1 h-0.5 max-w-[60px] ${step > 1 ? 'bg-green-500' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Left Panel */}
          <div className="lg:col-span-7">

            {/* STEP 1: Delivery Address */}
            {step === 1 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                    <MapPin size={20} className="text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-black text-slate-900">Delivery Address</h2>
                    <p className="text-xs text-slate-400 font-medium">Where should we deliver your order?</p>
                  </div>
                </div>

                {/* Saved Addresses Quick Select */}
                {user?.addresses?.length > 0 && (
                  <div className="mb-8 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Choose from saved</p>
                    <div className="flex gap-3">
                      {user.addresses.map((addr, idx) => (
                        <div key={idx} className="group relative shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setAddress({
                                name: user?.name || user?.firstName || '',
                                phone: user?.phone || '',
                                street: addr.street,
                                city: addr.city,
                                pincode: addr.zipCode,
                                area: addr.area || '',
                                landmark: addr.landmark || '',
                                label: addr.label || 'Home',
                                lat: addr.lat,
                                lng: addr.lng
                              });
                              if (addr.lat && addr.lng) {
                                setGpsCoords({ latitude: addr.lat, longitude: addr.lng });
                              }
                            }}
                            className="p-5 border-2 border-slate-100 bg-white rounded-2xl text-left hover:border-orange-500 hover:shadow-xl hover:shadow-orange-100/20 transition-all min-w-[200px] h-full"
                          >
                            <div className="text-xs font-black text-slate-900 uppercase mb-1 flex items-center justify-between gap-4">
                               {addr.label || 'Home'}
                               <div className="flex gap-2">
                                 <Edit2 size={12} className="text-slate-300 group-hover:text-orange-500 transition-colors" />
                               </div>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium line-clamp-2 mt-2 leading-relaxed">{addr.street}, {addr.city}</p>
                          </button>
                          
                          {/* Delete Action Overlay */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteAddress(idx); }}
                            className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleAddressNext} className="space-y-4">
                  {/* Name + Phone */}
                  <div className="flex gap-4">
                    {field('name', 'Full Name', 'text', true)}
                    {field('phone', 'Phone Number (10 digits)', 'tel', true)}
                  </div>

                  {/* Street */}
                  <div>
                    <textarea
                      rows={2}
                      placeholder="House/Flat No., Building Name, Street"
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                      className={`w-full px-4 py-3.5 rounded-xl border font-medium text-slate-900 outline-none transition-all text-sm resize-none
                        ${errors.street ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100'}`}
                    />
                    {errors.street && <p className="text-red-500 text-xs mt-1 font-bold">{errors.street}</p>}
                  </div>

                  {/* Area + City */}
                  <div className="flex gap-4">
                    {field('area', 'Area / Locality', 'text', true)}
                    {field('city', 'City', 'text', true)}
                  </div>

                  {/* Pincode + Landmark */}
                  <div className="flex gap-4">
                    {field('pincode', 'Pincode (6 digits)', 'text', true)}
                    {field('landmark', 'Landmark (optional)', 'text', true)}
                  </div>
                  {/* GPS Location & Routing Map */}
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${gpsCoords ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                          <MapPin size={24} className={gpsCoords ? 'text-emerald-600' : 'text-orange-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                             <p className="text-sm font-black text-slate-900 truncate">
                               {gpsCoords
                                 ? `📍 GPS: ${gpsCoords.latitude.toFixed(6)}, ${gpsCoords.longitude.toFixed(6)}`
                                 : 'Enable Live Tracking'}
                             </p>
                             {gpsCoords && (
                               <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                 LIVE GPS ACTIVE
                               </span>
                             )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                            {gpsCoords ? 'Coordinates verified for road-accurate tracking' : 'Auto-fill & road-accurate delivery fee'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleUseMyLocation}
                          disabled={gpsLoading || !!gpsCoords}
                          className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm whitespace-nowrap ${
                            gpsCoords
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95 shadow-orange-200'
                          } disabled:opacity-60`}
                        >
                          {gpsLoading ? 'Locating...' : gpsCoords ? '✓ Saved' : 'Use Current'}
                        </button>
                      </div>

                      {/* Map Pin Button correctly separated */}
                      <button
                        type="button"
                        onClick={() => setIsAddressModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-black text-[10px] uppercase tracking-widest hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-all"
                      >
                        <Navigation size={14} />
                        Pin Detailed Address on Map
                      </button>
                    </div>

                    {/* Preview Map */}
                    {gpsCoords && restLocation && isGoogleLoaded && (
                      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 h-60 w-full relative group animate-in fade-in zoom-in duration-500">
                        <Map
                          defaultCenter={{
                            lat: (gpsCoords.latitude + restLocation.latitude) / 2,
                            lng: (gpsCoords.longitude + restLocation.longitude) / 2
                          }}
                          defaultZoom={13}
                          style={{ height: '100%', width: '100%' }}
                          disableDefaultUI={true}
                          mapId="DEMO_MAP_ID"
                          gestureHandling={'greedy'}
                        >
                          <AdvancedMarker position={{lat: restLocation.latitude, lng: restLocation.longitude}}>
                              <img src="https://cdn-icons-png.flaticon.com/512/3448/3448607.png" style={{width: 38, height: 38}} alt="restaurant" />
                          </AdvancedMarker>

                          <AdvancedMarker position={{lat: gpsCoords.latitude, lng: gpsCoords.longitude}}>
                              <img src="https://cdn-icons-png.flaticon.com/512/1077/1077114.png" style={{width: 38, height: 38}} alt="home" />
                          </AdvancedMarker>
                        </Map>

                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg z-[1000] border border-slate-100 flex items-center gap-2">
                          <Navigation size={12} className="text-orange-500" />
                          Delivery Route Preview {distanceKm ? `(${distanceKm.toFixed(1)} km)` : ''}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      disabled={saveLoading}
                      className="flex-1 border-2 border-slate-100 text-slate-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-orange-200 hover:bg-orange-50/30 hover:text-orange-600 transition-all flex items-center justify-center gap-2"
                    >
                      {saveLoading ? 'Saving...' : <><Save size={16} /> Save Address</>}
                    </button>
                    <button
                      type="submit"
                      className="flex-[2] bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-orange-100 flex items-center justify-center gap-2"
                    >
                      Continue to Payment <ChevronRight size={18} />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: Payment */}
            {step === 2 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                    <CreditCard size={20} className="text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Payment Method</h2>
                    <p className="text-xs text-slate-400 font-medium">All transactions are 100% secure</p>
                  </div>
                </div>

                {/* Delivery address summary */}
                <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 flex gap-3">
                  <MapPin size={16} className="text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Delivering to</p>
                    <p className="text-sm font-bold text-slate-900">{address.name} · {address.phone}</p>
                    <p className="text-sm text-slate-500 font-medium">{address.street}, {address.area}, {address.city} – {address.pincode}</p>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      {address.landmark && <p className="text-xs text-slate-400 font-medium">Near: {address.landmark}</p>}
                      {gpsCoords && (
                        <p className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                          <Navigation size={10} /> 
                          LIVE-TRACKING ENABLED
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Options */}
                <div className="space-y-3 mb-8">
                  {PAYMENT_METHODS.map(({ id, label, icon: Icon, desc }) => (
                    <label
                      key={id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all
                        ${paymentMethod === id ? 'border-orange-400 bg-orange-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={id}
                        checked={paymentMethod === id}
                        onChange={() => setPaymentMethod(id)}
                        className="accent-orange-500 w-4 h-4 shrink-0"
                      />
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === id ? 'bg-orange-100' : 'bg-slate-100'}`}>
                        <Icon size={20} className={paymentMethod === id ? 'text-orange-600' : 'text-slate-500'} />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-slate-900 text-sm">{label}</p>
                        <p className="text-slate-400 text-xs font-medium">{desc}</p>
                      </div>
                      {paymentMethod === id && <CheckCircle size={18} className="text-orange-500 shrink-0" />}
                    </label>
                  ))}
                </div>

                {paymentMethod === 'upi' && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">UPI ID</label>
                    <input
                      type="text"
                      placeholder="yourname@upi"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium text-slate-900 text-sm"
                    />
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="mb-6 space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <input type="text" placeholder="Card Number" maxLength={19}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium text-slate-900 text-sm" />
                    <div className="flex gap-3">
                      <input type="text" placeholder="MM / YY" maxLength={5}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium text-slate-900 text-sm" />
                      <input type="text" placeholder="CVV" maxLength={4}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium text-slate-900 text-sm" />
                    </div>
                    <input type="text" placeholder="Name on Card"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium text-slate-900 text-sm" />
                  </div>
                )}

                {paymentMethod === 'wallet' && (
                  <div className="mb-6 p-4 bg-orange-50 rounded-2xl border border-orange-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Available Balance</span>
                      <span className="text-sm font-black text-orange-600">₹{walletBalance.toLocaleString()}</span>
                    </div>
                    {walletBalance < total ? (
                      <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest leading-relaxed">Insufficient balance. Your wallet has ₹{walletBalance} but order is ₹{total.toFixed(0)}. Please top up or choose another method.</p>
                    ) : (
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest leading-relaxed">✓ Balance sufficient. ₹{total.toFixed(0)} will be debited from your wallet.</p>
                    )}
                  </div>
                )}

                {/* Error Banner */}
                {orderError && (
                  <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                    <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white text-[10px] font-black">!</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-rose-700 font-black text-sm">{orderError}</p>
                      {orderError.toLowerCase().includes('wallet') && (
                        <button onClick={() => navigate('/dashboard')} className="mt-2 text-[10px] font-black uppercase tracking-widest text-rose-600 underline underline-offset-2 hover:text-rose-800">
                          Top Up Wallet →
                        </button>
                      )}
                    </div>
                    <button onClick={() => setOrderError('')} className="text-rose-400 hover:text-rose-600 transition-colors shrink-0">
                      <span className="text-sm font-black">✕</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={handlePlaceOrder}
                  disabled={loading || (paymentMethod === 'wallet' && walletBalance < total)}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-orange-100 flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing Payment…
                    </>
                  ) : (
                    <><Lock size={16} /> Pay ₹{total.toFixed(0)} & Place Order</>
                  )}
                </button>
                <p className="text-center text-slate-400 text-xs font-medium mt-3">🔒 Secured by 256-bit SSL encryption</p>
              </div>
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-slate-950 text-white p-8 rounded-3xl shadow-2xl shadow-orange-100/20 sticky top-28">
              <div className="flex items-center gap-3 mb-7">
                <ShoppingBag size={18} className="text-orange-400" />
                <h3 className="text-lg font-black tracking-tight">Order Summary</h3>
              </div>

              <div className="space-y-3 border-b border-white/10 pb-5 mb-5 max-h-52 overflow-y-auto">
                {items.map((item) => (
                  <div key={item._id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-800">
                        <img src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&q=60'}
                          alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&q=60'; }} />
                      </div>
                      <span className="text-slate-300 font-medium">{item.name} × {item.quantity}</span>
                    </div>
                    <span className="font-black text-white">₹{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              {/* Promo Code Section */}
              <div className="border-b border-white/10 pb-5 mb-5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Tag size={14} /> Apply Promo Code</p>
                {coupon ? (
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-2">
                       <Tag size={16} className="text-emerald-400" />
                       <div>
                         <p className="text-sm font-black text-emerald-400">{coupon} Applied</p>
                         <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest leading-none mt-1">You saved ₹{discount.toFixed(0)}!</p>
                       </div>
                    </div>
                    <button onClick={handleRemoveCoupon} className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={couponInput}
                        onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponMsg(null); }}
                        placeholder="e.g. FIRST50" 
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-black text-white outline-none focus:border-orange-500 focus:bg-white/10 transition-all uppercase placeholder:normal-case placeholder:font-medium placeholder:text-slate-600"
                        onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                      />
                      <button 
                        onClick={handleApplyCoupon}
                        className="bg-white/10 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all"
                      >
                        Apply
                      </button>
                    </div>
                    {couponMsg && (
                       <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${couponMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                         {couponMsg.ok ? '✓ ' : '! '}{couponMsg.text}
                       </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {VALID_CODES.slice(0, 3).map(c => (
                        <button key={c} onClick={() => { setCouponInput(c); setCouponMsg(null); }} className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white/5 px-2 py-1 rounded hover:bg-white/10 hover:text-white transition-colors">
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 border-b border-white/10 pb-5 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-bold">Subtotal</span>
                  <span className="text-white font-black">₹{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-sm uppercase tracking-wider">Delivery Fee</span>
                    <span className="text-white font-black">
                       {distanceKm === null ? '₹30' : (deliveryFee > 0 ? `₹${deliveryFee}` : 'FREE')}
                    </span>
                  </div>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${distanceKm === null ? 'text-orange-500 animate-pulse' : 'text-slate-500'}`}>
                    {distanceKm === null ? '📍 Share location for road-accurate fee' : `✓ ${deliveryNote}`}
                  </p>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-bold">Taxes (5%)</span>
                  <span className="text-white font-black">₹{tax}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-400 font-bold">Discount ({coupon})</span>
                    <span className="text-emerald-400 font-black">−₹{discount.toFixed(0)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end">
                <span className="text-slate-400 font-black uppercase text-xs tracking-widest">Total</span>
                <span className="text-4xl font-black text-orange-400 tracking-tighter">₹{total.toFixed(0)}</span>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-900 rounded-2xl p-3">
                <Lock size={12} className="text-orange-500" />
                Safe & encrypted payment gateway
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <AddressManagerModal 
        isOpen={isAddressModalOpen} 
        onClose={() => setIsAddressModalOpen(false)} 
      />
    </div>
  );
}