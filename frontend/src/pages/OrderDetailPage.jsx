import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Clock, User, Phone, Package, CheckCircle, ChevronLeft } from 'lucide-react';
import Loader from '../components/Loader';
import { useAuthStore } from '../context/authStore';
import { useOrderStore } from '../store/orderStore';
import API from '../api/axios';


export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { user } = useAuthStore();
  const [order, setOrder] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await API.get(`/orders/${orderId}`);
      setOrder(response.data.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setActionLoading(true);
    try {
      await useOrderStore.getState().updateStatus(order._id, newStatus);
      await fetchOrder(); // Refresh data
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loader />;
  if (!order) return <div className="text-center py-20">Order not found</div>;

  const statusSteps = ['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered'];
  const currentStepIndex = statusSteps.indexOf(order.orderStatus);
  const isCancelled = order.orderStatus === 'cancelled';

  return (
    <div className="min-h-screen bg-[#F8F9FB] pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">

        {/* Navigation & Actions */}
        <div className="flex justify-between items-center mb-8">
          <Link to={user?.role === 'rider' ? '/rider' : user?.role === 'admin' ? '/admin' : '/orders'} className="flex items-center gap-2 text-slate-400 font-bold hover:text-orange-600 transition-colors group">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:border-orange-100 transition-all">
              <ChevronLeft size={18} />
            </div>
            <span className="text-xs uppercase tracking-widest">Back to {user?.role === 'rider' ? 'Console' : 'History'}</span>
          </Link>

          {/* Rider Actions */}
          {user?.role === 'rider' && order.rider?._id === user._id && !['delivered', 'cancelled'].includes(order.orderStatus) && (
            <div className="flex gap-2">
              {order.orderStatus === 'ready' && (
                <button
                  onClick={() => handleStatusUpdate('picked_up')}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Confirm Pickup'}
                </button>
              )}
              {order.orderStatus === 'picked_up' && (
                <button
                  onClick={() => handleStatusUpdate('delivered')}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Mark Delivered'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Order Header Card */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 mb-8 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 tracking-tighter">Order <span className="text-orange-600">#{order.orderId || order._id.slice(-8)}</span></h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
              Placed on {new Date(order.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border shadow-sm ${order.orderStatus === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
            order.orderStatus === 'cancelled' ? 'bg-rose-50 text-rose-500 border-rose-100' :
              'bg-orange-50 text-orange-600 border-orange-100'
            }`}>
            {order.orderStatus.replace('_', ' ')}
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-[2.5rem] p-10 mb-8 shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-900 mb-10 uppercase tracking-[0.2em] text-center">Journey Tracker</h3>
          <div className="relative">
            <div className="flex justify-between relative z-10">
              {statusSteps.map((step, idx) => {
                const isActive = statusSteps.indexOf(order.orderStatus) >= statusSteps.indexOf(step);
                const labels = {
                  'placed': 'Placed',
                  'confirmed': 'Confirmed',
                  'preparing': 'Preparing',
                  'ready': 'Ready',
                  'picked_up': 'Picked Up',
                  'delivered': 'Delivered'
                };
                return (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs mb-4 transition-all duration-500 border ${isActive ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-100' : 'bg-slate-50 text-slate-300 border-slate-100'
                      }`}>
                      {idx + 1}
                    </div>
                    <p className={`text-[9px] font-black uppercase tracking-widest text-center hidden md:block ${isActive ? 'text-slate-900' : 'text-slate-300'}`}>
                      {labels[step]}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="absolute top-5 left-0 right-0 h-1 bg-slate-100 -z-0 mx-10 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-1000 ease-out"
                style={{ width: `${(Math.max(0, currentStepIndex) / (statusSteps.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Items Table */}
          <div className="md:col-span-2 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3">
              <Package size={16} className="text-orange-500" /> Order Items
            </h3>
            <div className="divide-y divide-slate-50">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-6 flex justify-between items-center group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-300 border border-slate-100 uppercase transition-all group-hover:border-orange-200">
                      {item.name?.[0]}
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-black text-slate-900 text-lg">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl shadow-orange-100/50 text-white self-start">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Summary</h3>
            <div className="space-y-4 mb-8">
              {[
                { label: 'Subtotal', value: order.subtotal },
                { label: 'Tax', value: order.tax },
                { label: 'Delivery', value: order.deliveryFee },
                { label: 'Discount', value: -order.discount, color: 'text-emerald-400' }
              ].filter(item => item.value !== 0).map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">{item.label}</span>
                  <span className={`font-black ${item.color || 'text-white'}`}>₹{Math.abs(item.value)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-6">
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">Total Paid</p>
              <p className="text-4xl font-black text-orange-400 tracking-tighter">₹{order.total}</p>
            </div>
          </div>
        </div>

        {/* Information Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Logistics Info */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Delivery Logic</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <Package size={20} />
                </div>
                <div>
                  <p className="font-black text-slate-900 border-b-2 border-orange-500/10 inline-block mb-1">{order.restaurant?.name}</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{order.restaurant?.location?.address || 'Pickup at Restaurant'}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="font-black text-slate-900 border-b-2 border-blue-500/10 inline-block mb-1">Destination</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {order.deliveryAddress?.label && <span className="font-black block text-[10px] text-orange-600 mb-0.5">{order.deliveryAddress.label.toUpperCase()}</span>}
                    {order.deliveryAddress?.street}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state} {order.deliveryAddress?.zipCode}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rider/Time Info */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Timeline & Staff</h3>
              {order.rider ? (
                <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">
                    {order.rider.firstName?.[0] || 'R'}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">{order.rider.firstName} {order.rider.lastName}</p>
                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                      <Phone size={10} className="text-orange-500" /> {order.rider.phone}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 mb-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigning Rider...</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimated Delivery</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">
                  {order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ASAP'}
                </p>
                {order.actualDeliveryTime && (
                  <p className="text-emerald-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 mt-1">
                    <CheckCircle size={12} /> Delivered at {new Date(order.actualDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

