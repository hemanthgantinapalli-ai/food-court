import React from 'react';
import { ShoppingCart, MapPin, TrendingUp, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import { useAuthStore } from '../context/authStore';
import API from '../api/axios';

export default function RiderDashboard() {
  const { user } = useAuthStore();
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('available');
  const [isOnline, setIsOnline] = React.useState(false);

  React.useEffect(() => {
    if (user?.role === 'rider') {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      // Fetch orders assigned to this rider
      const response = await API.get('/orders/history');
      setOrders(response.data.data.filter((o) => o.rider?._id === user._id));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'rider') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1>Unauthorized Access</h1>
      </div>
    );
  }

  if (loading) return <Loader />;

  const totalDeliveries = orders.length;
  const completedDeliveries = orders.filter((o) => o.orderStatus === 'delivered').length;
  const totalEarnings = orders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

  return (
    <div className="min-h-screen bg-light flex flex-col">
      <Header />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Rider Dashboard</h1>
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-6 py-3 rounded-lg font-bold text-white transition ${
              isOnline ? 'bg-success' : 'bg-danger'
            }`}
          >
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">Total Deliveries</p>
                <p className="text-3xl font-bold text-primary">{totalDeliveries}</p>
              </div>
              <ShoppingCart size={24} className="text-primary opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">Completed</p>
                <p className="text-3xl font-bold text-success">{completedDeliveries}</p>
              </div>
              <AlertCircle size={24} className="text-success opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">Total Earnings</p>
                <p className="text-3xl font-bold text-warning">₹{totalEarnings}</p>
              </div>
              <TrendingUp size={24} className="text-warning opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">Status</p>
                <p className={`text-3xl font-bold ${isOnline ? 'text-success' : 'text-danger'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
              <MapPin size={24} className={isOnline ? 'text-success opacity-50' : 'text-danger opacity-50'} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b">
            {['available', 'active', 'completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-semibold transition ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} Orders
              </button>
            ))}
          </div>

          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Orders</h3>
            <div className="space-y-3">
              {activeTab === 'available' && (
                <p className="text-gray-600">No available orders. Please go online to accept orders.</p>
              )}
              {activeTab === 'active' && (
                orders
                  .filter((o) => ['picked_up'].includes(o.orderStatus))
                  .map((order) => (
                    <div key={order._id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-bold">Order #{order.orderId}</p>
                          <p className="text-sm text-gray-600">{order.restaurant.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">₹{order.deliveryFee}</p>
                          <button className="text-primary text-sm font-semibold hover:underline">
                            Get Directions
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
              {activeTab === 'completed' && (
                orders
                  .filter((o) => o.orderStatus === 'delivered')
                  .map((order) => (
                    <div key={order._id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-bold">Order #{order.orderId}</p>
                          <p className="text-sm text-gray-600">{order.restaurant.name}</p>
                        </div>
                        <p className="font-bold text-success">✓ Delivered</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
