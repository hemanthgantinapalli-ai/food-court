import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle, MapPin, Receipt, ArrowRight, ChevronRight, CreditCard, Smartphone, Banknote, Map } from 'lucide-react';
import { useAuthStore } from '../context/authStore';
import { useOrderStore } from '../store/orderStore';

export default function OrderHistoryPage() {
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useAuthStore();
  const { getUserOrders } = useOrderStore();

  const [myOrders, setMyOrders] = useState([]);

  useEffect(() => {
    if (user) {
      setMyOrders(getUserOrders(user._id || user.id));
    }
  }, [user, getUserOrders]);

  const filteredOrders = myOrders.filter(o => {
    const rawStatus = o.status || o.orderStatus || '';
    const status = rawStatus.toLowerCase();
    if (activeTab === 'ongoing') {
      return status !== 'delivered' && status !== 'cancelled' && status !== '';
    }
    if (activeTab === 'past') {
      return status === 'delivered' || status === 'cancelled';
    }
    return true;
  });

  const getStatusColor = (rawStatus) => {
    const status = (rawStatus || '').toLowerCase();
    if (status === 'out for delivery' || status === 'picked_up') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (status === 'preparing' || status === 'processing' || status === 'placed') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (status === 'delivered') return 'text-green-600 bg-green-50 border-green-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const getPaymentIcon = (type) => {
    if (type === 'upi') return <Smartphone size={16} className="text-orange-500" />;
    if (type === 'card') return <CreditCard size={16} className="text-orange-500" />;
    return <Banknote size={16} className="text-orange-500" />;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] py-12 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <Link to="/profile" className="inline-flex items-center gap-2 text-slate-400 hover:text-orange-600 transition-colors font-bold text-sm mb-6">
            <ArrowRight size={16} className="rotate-180" /> Back to Profile
          </Link>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            My <span className="text-orange-500">Orders.</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2">View your order details, tracking status, and payment receipts.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {['all', 'ongoing', 'past'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-full font-bold text-sm capitalize whitespace-nowrap transition-all border-2
                ${activeTab === tab ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              {tab} Orders
            </button>
          ))}
        </div>

        {/* Order List */}
        <div className="space-y-6">
          {filteredOrders.length > 0 ? filteredOrders.map((order) => (
            <div key={order._id || order.id || Math.random()} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">

              {/* Order Header */}
              <div className="flex flex-wrap flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100 shrink-0">
                    <Receipt size={24} className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{order._id || order.id}</h3>
                    <p className="text-sm text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                      <Clock size={14} /> {order.createdAt ? new Date(order.createdAt).toLocaleString() : order.date}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-center sm:text-right">
                  {order.eta && (
                    <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm">
                      <Map size={14} className="text-orange-400" /> ETA: {order.eta}
                    </div>
                  )}
                  <div className={`px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-widest border ${getStatusColor(order.status || order.orderStatus)}`}>
                    {order.status || order.orderStatus || 'Pending'}
                  </div>
                </div>
              </div>

              {/* Order Details (Main Block) */}
              <div className="py-6 grid grid-cols-1 md:grid-cols-12 gap-8">

                {/* Items */}
                <div className="md:col-span-6 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Items Ordered</h4>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-center">
                      <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                        <img src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&q=60'} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                        <p className="text-slate-400 font-medium text-xs">Qty: {item.quantity || item.qty}</p>
                      </div>
                      <p className="font-black text-slate-900">₹{(item.price * (item.quantity || item.qty)).toFixed(0)}</p>
                    </div>
                  ))}
                </div>

                {/* Info (Payment & Address) */}
                <div className="md:col-span-6 space-y-5 border-t md:border-t-0 md:border-l border-slate-100 md:pl-8 pt-5 md:pt-0">

                  {/* Total & Payment */}
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Payment Info</h4>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-200 border-dashed">
                        <span className="text-slate-500 font-bold text-sm">Order Total</span>
                        <span className="text-xl font-black text-orange-500 tracking-tight">₹{order.total}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {order.paymentMethod?.type ? getPaymentIcon(order.paymentMethod.type) : getPaymentIcon(order.paymentMethod)}
                        <span className="text-slate-700 font-bold capitalize">{order.paymentMethod?.label || order.paymentMethod}</span>
                        <span className="ml-auto text-green-600 bg-green-100 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">Paid</span>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Delivered To</h4>
                    <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <MapPin size={16} className="text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-slate-600 leading-relaxed">
                        {order.deliveryAddress ? `${order.deliveryAddress.street}, ${order.deliveryAddress.area}, ${order.deliveryAddress.city}` : order.address}
                      </p>
                    </div>
                  </div>

                </div>

              </div>

              {/* Actions Footer */}
              <div className="pt-5 border-t border-slate-100 flex gap-3 sm:justify-end">
                {(order.status || order.orderStatus)?.toLowerCase() !== 'delivered' && (
                  <Link
                    to="/track-order"
                    className="flex-1 sm:flex-none justify-center bg-orange-500 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 flex items-center gap-2"
                  >
                    Track Order <Map size={16} />
                  </Link>
                )}
                <button className="flex-1 sm:flex-none justify-center px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-2">
                  <Receipt size={16} /> Download Invoice
                </button>
              </div>

            </div>
          )) : (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Package size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-black text-slate-900 mb-2">No orders found</h3>
              <p className="text-slate-500 font-medium mb-6">Looks like you haven't placed an order yet.</p>
              <Link to="/" className="inline-block bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-orange-500 transition-colors shadow-lg">
                Browse Restaurants
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}