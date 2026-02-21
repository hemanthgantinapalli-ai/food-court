import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Smartphone, Banknote, ChevronRight, CheckCircle, ArrowLeft, ShoppingBag, Lock } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../context/authStore';
import { useOrderStore } from '../store/orderStore';

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI / QR Code', icon: Smartphone, desc: 'Google Pay, PhonePe, Paytm' },
  { id: 'card', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, RuPay' },
  { id: 'cod', label: 'Cash on Delivery', icon: Banknote, desc: 'Pay when you receive' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getTotal, discount, coupon, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const { addOrder } = useOrderStore();


  const [step, setStep] = useState(1); // 1 = Address, 2 = Payment
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [success, setSuccess] = useState(false);

  const [address, setAddress] = useState({
    name: user?.name || user?.firstName || '',
    phone: user?.phone || '',
    street: '',
    area: '',
    city: '',
    pincode: '',
    landmark: '',
  });
  const [errors, setErrors] = useState({});

  const subtotal = getTotal();
  const deliveryFee = subtotal > 0 ? 49 : 0;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + deliveryFee + tax - (discount || 0);

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
    e.preventDefault();
    if (validate()) setStep(2);
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 2000));

    const paymentSelected = PAYMENT_METHODS.find((m) => m.id === paymentMethod) || PAYMENT_METHODS[0];

    const orderData = {
      id: `#FC-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: user?.id,
      date: new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      }),
      status: 'Preparing',
      total: total.toFixed(0),
      paymentMethod: { type: paymentMethod, label: paymentSelected.label },
      address: `${address.street}, ${address.area}, ${address.city} - ${address.pincode}`,
      items: items.map(i => ({ name: i.name, qty: i.quantity, price: i.price, image: i.image })),
      eta: '45 Mins'
    };

    addOrder(orderData);

    clearCart();
    setLoading(false);
    setSuccess(true);
    setTimeout(() => navigate('/payment-success'), 1500);
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
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Delivery Address</h2>
                    <p className="text-xs text-slate-400 font-medium">Where should we deliver your order?</p>
                  </div>
                </div>

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

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-orange-100 flex items-center justify-center gap-2 mt-2"
                  >
                    Continue to Payment <ChevronRight size={18} />
                  </button>
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
                    {address.landmark && <p className="text-xs text-slate-400 font-medium mt-0.5">Near: {address.landmark}</p>}
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

                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
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

              <div className="space-y-3 border-b border-white/10 pb-5 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-bold">Subtotal</span>
                  <span className="text-white font-black">₹{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-bold">Delivery</span>
                  <span className="text-white font-black">₹{deliveryFee}</span>
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
    </div>
  );
}