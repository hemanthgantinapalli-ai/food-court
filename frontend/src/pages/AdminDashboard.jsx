import React, { useEffect, useState } from 'react';
import { Users, ShoppingCart, TrendingUp, Building, Bike } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
// ...rest of your code...import API from '../api/axios';


export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('overview');

  React.useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await API.get('/admin/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1>Unauthorized Access</h1>
      </div>
    );
  }

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-light flex flex-col">
      <Header />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-primary">{stats?.totalUsers || 0}</p>
              </div>
              <Users size={24} className="text-primary opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">Total Orders</p>
                <p className="text-3xl font-bold text-secondary">{stats?.totalOrders || 0}</p>
              </div>
              <ShoppingCart size={24} className="text-secondary opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold text-success">₹{stats?.totalRevenue || 0}</p>
              </div>
              <TrendingUp size={24} className="text-success opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">Restaurants</p>
                <p className="text-3xl font-bold text-warning">{stats?.totalRestaurants || 0}</p>
              </div>
              <Building size={24} className="text-warning opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">Active Riders</p>
                <p className="text-3xl font-bold text-danger">{stats?.totalRiders || 0}</p>
              </div>
              <Bike size={24} className="text-danger opacity-50" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b">
            {['overview', 'users', 'restaurants', 'orders'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-semibold transition ${activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-600 hover:text-gray-800'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold mb-4">Platform Overview</h3>
                <p className="text-gray-600">
                  Welcome to the FoodCourt Admin Dashboard. Here you can manage users, restaurants,
                  orders, and view comprehensive analytics about the platform.
                </p>
                <div className="mt-6 grid md:grid-cols-2 gap-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-bold mb-2">User Management</h4>
                    <p className="text-sm text-gray-600">
                      View, manage, and monitor all users on the platform
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-bold mb-2">Restaurant Control</h4>
                    <p className="text-sm text-gray-600">
                      Approve, monitor, and manage restaurant partners
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-bold mb-2">Order Monitoring</h4>
                    <p className="text-sm text-gray-600">
                      Track all orders and resolve customer issues
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-bold mb-2">Analytics</h4>
                    <p className="text-sm text-gray-600">
                      View detailed analytics and performance metrics
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h3 className="text-lg font-bold mb-4">User Management</h3>
                <p className="text-gray-600">User management interface will appear here</p>
              </div>
            )}

            {activeTab === 'restaurants' && (
              <div>
                <h3 className="text-lg font-bold mb-4">Restaurant Management</h3>
                <p className="text-gray-600">Restaurant management interface will appear here</p>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h3 className="text-lg font-bold mb-4">Order Monitoring</h3>
                <p className="text-gray-600">Order monitoring interface will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
