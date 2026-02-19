import React from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Clock, User, Phone, Package } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import API from '../api/axios';

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

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

  if (loading) return <Loader />;
  if (!order) return <div className="text-center py-20">Order not found</div>;

  const statusSteps = ['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered'];
  const currentStepIndex = statusSteps.indexOf(order.orderStatus);

  return (
    <div className="min-h-screen bg-light flex flex-col">
      <Header />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Order Header */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-2">Order #{order.orderId}</h1>
              <p className="text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold px-4 py-2 rounded text-white ${
                order.orderStatus === 'delivered'
                  ? 'bg-success'
                  : order.orderStatus === 'cancelled'
                  ? 'bg-danger'
                  : 'bg-primary'
              }`}>
                {order.orderStatus.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Order Timeline */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold mb-6">Order Timeline</h3>
          <div className="relative">
            <div className="flex justify-between">
              {statusSteps.map((step, idx) => (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white mb-2 ${
                      idx <= currentStepIndex ? 'bg-success' : 'bg-gray-300'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <p className="text-xs text-center capitalize hidden sm:block">
                    {step.replace('_', ' ')}
                  </p>
                </div>
              ))}
            </div>
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-10">
              <div
                className="h-full bg-success transition-all"
                style={{
                  width: `${((currentStepIndex + 1) / statusSteps.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Order Items */}
          <div className="md:col-span-2 bg-white rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Order Items</h3>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-3 border-b">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Order Totals */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Order Total</h3>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>₹{order.tax}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>₹{order.deliveryFee}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-₹{order.discount}</span>
                </div>
              )}
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">₹{order.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Restaurant Info */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package size={20} /> Restaurant
            </h3>
            <p className="font-semibold text-lg mb-4">{order.restaurant.name}</p>
            <p className="text-gray-600 text-sm">{order.restaurant.location?.address}</p>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MapPin size={20} /> Delivery Address
            </h3>
            <p className="font-semibold text-lg mb-1">{order.deliveryAddress.label}</p>
            <p className="text-gray-600 text-sm">
              {order.deliveryAddress.street}, {order.deliveryAddress.city}
              <br />
              {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
            </p>
          </div>

          {/* Rider Info */}
          {order.rider && (
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <User size={20} /> Delivery Rider
              </h3>
              <p className="font-semibold">{order.rider.firstName} {order.rider.lastName}</p>
              <p className="text-gray-600 text-sm flex items-center gap-2 mt-2">
                <Phone size={16} /> {order.rider.phone}
              </p>
            </div>
          )}

          {/* Delivery Time */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock size={20} /> Delivery Time
            </h3>
            <p className="text-gray-600 text-sm">
              Estimated: {new Date(order.estimatedDeliveryTime).toLocaleTimeString()}
            </p>
            {order.actualDeliveryTime && (
              <p className="text-success font-semibold text-sm mt-2">
                Delivered: {new Date(order.actualDeliveryTime).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
