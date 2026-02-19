import React from 'react';
import { ShoppingCart, TrendingUp, BarChart3, Menu } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import { useAuthStore } from '../context/authStore';
import API from '../api/axios';

export default function RestaurantDashboard() {
  const { user } = useAuthStore();
  const [restaurant, setRestaurant] = React.useState(null);
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('overview');

  React.useEffect(() => {
    if (user?.role === 'restaurant') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch restaurant data and orders
      const response = await API.get('/restaurants');
      const myRestaurant = response.data.data.find((r) => r.owner._id === user._id);
      setRestaurant(myRestaurant);

      if (myRestaurant) {
        const ordersResponse = await API.get(`/restaurants/${myRestaurant._id}/orders`);
        setOrders(ordersResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'restaurant') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1>Unauthorized Access</h1>
      </div>
    );
  }

  if (loading) return <Loader />;

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const pendingOrders = orders.filter((o) => o.orderStatus === 'placed').length;

  return (
    <div className="min-h-screen bg-light flex flex-col">
      <Header />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Restaurant Dashboard</h1>

        {!restaurant ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <h2 className="text-2xl font-bold mb-4">No Restaurant Found</h2>
            <p className="text-gray-600">Please create a restaurant to access this dashboard</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg p-6 shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm">Total Orders</p>
                    <p className="text-3xl font-bold text-primary">{totalOrders}</p>
                  </div>
                  <ShoppingCart size={24} className="text-primary opacity-50" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm">Pending Orders</p>
                    <p className="text-3xl font-bold text-warning">{pendingOrders}</p>
                  </div>
                  <Menu size={24} className="text-warning opacity-50" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-success">₹{totalRevenue}</p>
                  </div>
                  <TrendingUp size={24} className="text-success opacity-50" />
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm">Rating</p>
                    <p className="text-3xl font-bold text-warning">⭐ {restaurant.rating.toFixed(1)}</p>
                  </div>
                  <BarChart3 size={24} className="text-warning opacity-50" />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
              <div className="flex border-b">
                {['overview', 'orders', 'menu'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 font-semibold transition ${
                      activeTab === tab
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div>
                    <h3 className="text-lg font-bold mb-4">{restaurant.name}</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Address</p>
                        <p className="font-semibold">{restaurant.location.address}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Contact</p>
                        <p className="font-semibold">{restaurant.contactPhone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Delivery Time</p>
                        <p className="font-semibold">{restaurant.deliveryTime} min</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Status</p>
                        <p className={`font-semibold ${restaurant.isApproved ? 'text-success' : 'text-warning'}`}>
                          {restaurant.isApproved ? 'Approved' : 'Pending Approval'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div>
                    <h3 className="text-lg font-bold mb-4">Recent Orders</h3>
                    <div className="space-y-3">
                      {orders.slice(0, 10).map((order) => (
                        <div key={order._id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold">Order #{order.orderId}</p>
                              <p className="text-sm text-gray-600">
                                Customer: {order.customer.firstName} {order.customer.lastName}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded text-sm font-semibold text-white ${
                              order.orderStatus === 'delivered'
                                ? 'bg-success'
                                : 'bg-primary'
                            }`}>
                              {order.orderStatus.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-lg font-bold text-primary mt-2">₹{order.total}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'menu' && (
                  <div>
                    <h3 className="text-lg font-bold mb-4">Menu Management</h3>
                    <p className="text-gray-600">
                      Menu management interface will appear here. You can add, edit, and manage menu items.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
