import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, Wifi, ShieldCheck, Users, ShoppingCart, TrendingUp, Building, ArrowUpRight, AlertCircle, Bell, Truck, Plus, Trash2, Edit3, X, CheckCircle, Eye, EyeOff, ArrowRight, DollarSign, MapPin, Navigation, Store, Signal, Shield } from 'lucide-react';
import Loader from '../components/Loader';
import { useAuthStore } from '../context/authStore';
import { useOrderStore } from '../store/orderStore';
import API from '../api/axios';
import { socket, connectSocket } from '../api/socket.js';
import AdminBI from '../components/AdminBI';
import ImageUploadField from '../components/ImageUploadField';
import LeafletFleetMap from '../components/LeafletFleetMap';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });



// Calculate distance in km
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};


const STATUS_COLORS = {
  placed: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready: 'bg-teal-100 text-teal-700',
  picked_up: 'bg-sky-100 text-sky-700',
  on_the_way: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [restaurantsList, setRestaurantsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]); // real-time new orders
  const [persistentNotifications, setPersistentNotifications] = useState([]); // persistent from DB
  const [supportTickets, setSupportTickets] = useState([]);
  const [ridersList, setRidersList] = useState([]);
  const [riderProfilesList, setRiderProfilesList] = useState([]); // for Rider applications map
  const [assigningRider, setAssigningRider] = useState(null);
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [newRestaurantForm, setNewRestaurantForm] = useState({
    name: '',
    description: '',
    image: '',
    cuisines: '',
    address: '',
    city: '',
    ownerId: '',
    commissionPercentage: 10
  });
  const [isSubmittingRest, setIsSubmittingRest] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [showUserPass, setShowUserPass] = useState(false);

  const [toasts, setToasts] = useState([]); // transient session notifications
  const [financeData, setFinanceData] = useState({ totalGrossRevenue: 0, totalCommission: 0, pendingRevenue: 0, weeklyReport: [], settlements: [], totalOrders: 0, averageOrderValue: 0 });
  const [platformSettings, setPlatformSettings] = useState({
    baseDeliveryFee: 30,
    perKmCharge: 10,
    platformCommission: 20,
    minOrderForFreeDelivery: 500,
    isMaintenanceMode: false
  });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [allTransactions, setAllTransactions] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');

  // GPS Tracking state
  const [onlineRiders, setOnlineRiders] = useState([]); // [{userId, name, location: {lat,lng}, ...}]
  const [assignModal, setAssignModal] = useState(null); // { order: {...}, restaurantCoords: {lat,lng} }
  const [assigningTo, setAssigningTo] = useState(null); // riderId being assigned

  const addToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [{ id, msg, type }, ...prev].slice(0, 10));
    setTimeout(() => setToasts(prev => prev.filter(n => n.id !== id)), 5000);
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();

      // Connect socket & join admins room
      if (user?._id) {
        connectSocket(user._id);
        socket.emit('join_role', 'admins');
      }

      // ── Real-time event handlers ──
      socket.on('new_order', (data) => {
        console.log('🆕 New order received by admin:', data);
        addToast(`🛒 New Order #${(data.orderId || data._id)?.slice(-6)} — ₹${data.total}`, 'order');
        fetchNotifications();

        // Transform incoming flat data to nested format expected by admin lists
        const normalizedOrder = {
          ...data,
          customer: { name: data.customerName || 'N/A' },
          restaurant: { name: data.restaurantName || 'Unknown Kitchen' },
        };

        setLiveOrders(prev => [normalizedOrder, ...prev]);
        setOrdersList(prev => [normalizedOrder, ...prev]);
        setStats(prev => prev ? { ...prev, totalOrders: (prev.totalOrders || 0) + 1 } : prev);
      });

      socket.on('order_claimed', (data) => {
        console.log('🛵 Order claimed by rider:', data);
        addToast(`🛵 Rider ${data.rider?.name || 'Unknown'} picked up Order #${data.orderId?.toString().slice(-6)}`, 'rider');
        fetchNotifications();
        // Update liveOrders list with rider info
        setLiveOrders(prev =>
          prev.map(o => o._id === data.orderId?.toString()
            ? { ...o, orderStatus: 'on_the_way', rider: data.rider }
            : o
          )
        );
        // Update main orders list too
        setOrdersList(prev =>
          prev.map(o => o._id === data.orderId?.toString()
            ? { ...o, orderStatus: 'on_the_way', rider: data.rider }
            : o
          )
        );
      });

      socket.on('order_status_update', (data) => {
        if (data.forAdmin) {
          setOrdersList(prev =>
            prev.map(o => o._id === data.orderId?.toString()
              ? { ...o, orderStatus: data.status }
              : o
            )
          );
          setLiveOrders(prev =>
            prev.map(o => o._id === data.orderId?.toString()
              ? { ...o, orderStatus: data.status }
              : o
            )
          );
          if (data.status === 'delivered') {
            addToast(`✅ Order #${data.orderId?.toString().slice(-6)} delivered!`, 'delivered');
            fetchNotifications();
          }
        }
      });

      socket.on('order_needs_rider', async (data) => {
        addToast(`🛵 Order #${(data.orderId || data._id)?.toString().slice(-6)} needs a rider!`, 'info');
        fetchNotifications();
        fetchData();

        // Fetch fresh online riders and open assignment modal with map
        try {
          const ridersRes = await API.get('/riders/online');
          setOnlineRiders(ridersRes.data.data || []);
        } catch (e) { console.error('Failed to fetch online riders', e); }

        // Try to extract restaurant coordinates from data
        const restLat = data.restaurantLocation?.latitude || data.restaurantAddress?.lat || null;
        const restLng = data.restaurantLocation?.longitude || data.restaurantAddress?.lng || null;

        setAssignModal({
          order: data,
          restaurantCoords: restLat && restLng ? { lat: restLat, lng: restLng } : null
        });
      });

      // Live rider GPS from socket (admin gets all updates)
      socket.on('rider_position_update', ({ riderId, location, heading, speed }) => {
        setOnlineRiders(prev => prev.map(r =>
          r.userId?.toString() === riderId ? { ...r, location, heading, speed } : r
        ));
      });

      socket.on('rider_came_online', ({ riderId, location }) => {
        // Add to online list if not already there, will be merged on next fetchOnlineRiders
        fetchOnlineRiders();
      });

      socket.on('rider_went_offline', ({ riderId }) => {
        setOnlineRiders(prev => prev.filter(r => r.userId?.toString() !== riderId));
      });

      socket.on('order_assigned', (data) => {
        addToast(`✅ Rider assigned to #${data.orderId?.toString().slice(-6)}`, 'success');
        fetchNotifications();
        fetchData();
        setAssignModal(null); // close the modal
      });

      socket.on('platform_earnings_update', (data) => {
        console.log('💰 Platform profit received:', data);
        addToast(`📈 Commission Received: ₹${data.amount}`, 'delivered');
        setStats(prev => prev ? {
          ...prev,
          totalCommission: (prev.totalCommission || 0) + data.amount
        } : prev);

        // Trigger a temporary glow effect on the profit card
        const card = document.getElementById('admin-profit-card');
        if (card) {
          card.classList.add('ring-4', 'ring-emerald-400', 'animate-pulse');
          setTimeout(() => card.classList.remove('ring-4', 'ring-emerald-400', 'animate-pulse'), 3000);
        }
      });

      return () => {
        socket.off('new_order');
        socket.off('order_claimed');
        socket.off('order_status_update');
        socket.off('order_needs_rider');
        socket.off('order_assigned');
        socket.off('platform_earnings_update');
        socket.off('rider_position_update');
        socket.off('rider_came_online');
        socket.off('rider_went_offline');
      };
    }
  }, [user]);

  const fetchAllTransactions = async () => {
    try {
      const res = await API.get('/wallet/all-transactions');
      setAllTransactions(res.data.data);
    } catch (err) {
      console.error('Error fetching all transactions:', err);
    }
  };

  const fetchData = async () => {
    const isInitialLoad = !stats || usersList.length === 0;
    if (isInitialLoad) setLoading(true);

    fetchNotifications();
    fetchOnlineRiders();

    try {
      const [statsRes, usersRes, restRes, ordersRes, supportRes, ridersRes, financeRes, settingsRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/users'),
        API.get('/admin/restaurants'),
        API.get('/admin/orders'),
        API.get('/support/my-requests'),
        API.get('/admin/riders'),
        API.get('/admin/finance'),
        API.get('/admin/settings'),
      ]);
      setStats(statsRes.data.data);
      setUsersList(usersRes.data.data);
      setRestaurantsList(restRes.data.data);
      setOrdersList(ordersRes.data.data);
      setSupportTickets(supportRes.data.data);
      setRidersList(usersRes.data.data.filter(u => u.role === 'rider'));
      setRiderProfilesList(ridersRes.data.data);
      setFinanceData(financeRes.data.data);
      setPlatformSettings(settingsRes.data.data);
      
      fetchAllTransactions();
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setPersistentNotifications(res.data.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchOnlineRiders = async () => {
    try {
      const res = await API.get('/riders/online');
      setOnlineRiders(res.data.data || []);
    } catch (err) {
      console.error('Error fetching online riders:', err);
    }
  };

  const handleAssignRiderFromModal = async (riderId) => {
    if (!assignModal?.order) return;
    setAssigningTo(riderId);
    try {
      const orderId = assignModal.order._id;
      const res = await API.post(`/admin/orders/${orderId}/assign`, { riderId });
      addToast('🛵 Rider assigned successfully!', 'success');
      const updatedOrder = res.data.data;
      setOrdersList(prev => prev.map(o => o._id === orderId ? updatedOrder : o));
      fetchNotifications();
      setAssignModal(null);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to assign rider', 'error');
    } finally {
      setAssigningTo(null);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await API.delete('/notifications/clear');
      setPersistentNotifications([]);
      addToast('🗑️ Notifications cleared', 'info');
    } catch (err) {
      addToast('Failed to clear notifications', 'error');
    }
  };

  const handleExportCSV = async () => {
    try {
      addToast('📊 Generating CSV Report...', 'info');
      const response = await API.get('/orders/export-analytics', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `foodcourt_orders_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      addToast('✅ Export downloaded successfully!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      // Silently log — the export may not be implemented yet on the backend
      addToast('📊 Export feature is being set up. Please try again later.', 'info');
    }
  };

  const handleUpdateSettings = async () => {
    setIsUpdatingSettings(true);
    try {
      await API.put('/admin/settings', platformSettings);
      addToast('🚀 Global Configuration Saved Successfully!', 'success');
    } catch (err) {
      console.error('Failed to update settings:', err);
      addToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleCreateRestaurant = async (e) => {
    e.preventDefault();
    setIsSubmittingRest(true);
    try {
      const payload = {
        name: newRestaurantForm.name,
        description: newRestaurantForm.description,
        image: newRestaurantForm.image,
        cuisines: newRestaurantForm.cuisines.split(',').map(c => c.trim()).filter(c => c !== ''),
        location: {
          address: newRestaurantForm.address,
          city: newRestaurantForm.city
        },
        owner: newRestaurantForm.ownerId || null,
        commissionPercentage: Number(newRestaurantForm.commissionPercentage) || 10
      };

      if (editingId) {
        const res = await API.put(`/restaurants/${editingId}`, payload);
        setRestaurantsList(prev => prev.map(r => r._id === editingId ? res.data.data : r));
        addToast('✨ Restaurant updated successfully!', 'info');
      } else {
        const res = await API.post('/restaurants', payload);
        setRestaurantsList(prev => [res.data.data, ...prev]);
        addToast('🏪 Restaurant added successfully!', 'info');
      }

      setShowAddRestaurant(false);
      setEditingId(null);
      setNewRestaurantForm({ name: '', description: '', image: '', cuisines: '', address: '', city: '', ownerId: '', commissionPercentage: 10 });
    } catch (err) {
      console.error('Failed to create restaurant:', err);
      addToast(err.response?.data?.message || 'Error saving restaurant', 'error');
    } finally {
      setIsSubmittingRest(false);
    }
  };

  const handleDeleteRestaurant = async (id) => {
    if (!window.confirm('Delete this restaurant forever?')) return;
    try {
      await API.delete(`/restaurants/${id}`);
      setRestaurantsList(prev => prev.filter(r => r._id !== id));
      addToast('🗑️ Restaurant deleted', 'info');
    } catch (err) {
      addToast('Delete failed. Please try again.', 'error');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <div className="text-center bg-white p-12 rounded-[2rem] shadow-sm border border-slate-100 max-w-sm w-full mx-4 font-sans">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-500 font-medium">You do not have permission to view the Admin Dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) return <Loader />;

  const activeOrders = ordersList.filter(o => !['delivered', 'cancelled'].includes(o.orderStatus));

  const statCards = [
    { label: 'Total Revenue', value: `₹${stats?.totalRevenue?.toLocaleString() || 0}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'admin-profit-card', label: 'Admin Profit', value: `₹${stats?.totalCommission?.toLocaleString() || 0}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Live Orders', value: activeOrders.length || 0, icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] pt-24 pb-12">

      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-50 space-y-2 max-w-xs w-full">
        {toasts.map(n => (
          <div
            key={n.id}
            className={`px-5 py-4 rounded-2xl shadow-2xl font-black text-sm text-white transition-all ${n.type === 'order' ? 'bg-orange-600' :
              n.type === 'rider' ? 'bg-indigo-600' :
                n.type === 'delivered' ? 'bg-emerald-600' : 'bg-slate-900'
              }`}
          >
            {n.msg}
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 mb-8 border border-white shadow-xl shadow-slate-200/40 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-100/50 rounded-full blur-[80px] group-hover:bg-orange-200/50 transition-all duration-1000" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-100/50 rounded-full blur-[80px] group-hover:bg-emerald-200/50 transition-all duration-1000" />
          
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Admin <span className="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">Dashboard</span>
            </h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
              Unified Control & Fleet Management
            </p>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            {liveOrders.length > 0 && (
              <div className="relative flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-orange-100 shadow-sm shadow-orange-100/50">
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-bounce" />
                <Bell className="text-orange-500" size={18} />
                <span className="font-black text-orange-700 text-[10px] uppercase tracking-widest">{liveOrders.length} Feed</span>
              </div>
            )}
            <div className="flex items-center gap-4 bg-slate-900/5 backdrop-blur-md p-4 rounded-[2rem] border border-white/50 shadow-inner">
              <div className="w-12 h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 transition-transform group-hover:rotate-12">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">System Status</p>
                <p className="font-black text-slate-900 text-xs">OPERATIONAL</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, i) => (
            <div key={i} id={stat.id} className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} opacity-0 group-hover:opacity-10 rounded-bl-[4rem] transition-opacity duration-500`} />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-3 group-hover:text-slate-500 transition-colors">{stat.label}</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter group-hover:scale-105 origin-left transition-transform duration-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {stat.value}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Real-time Verified</span>
                  </div>
                </div>
                <div className={`w-16 h-16 ${stat.bg} ${stat.color} rounded-[1.5rem] shadow-xl flex items-center justify-center transition-all duration-700 group-hover:rotate-[15deg] group-hover:scale-110`}>
                  <stat.icon size={32} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Tabs */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-50 p-3 gap-3 bg-slate-50/50 overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'intelligence', label: 'Analytics' },
              { id: 'live', label: 'Live Feed' },
              { id: 'gps', label: 'Fleet Map' },
              { id: 'orders', label: 'All Orders' },
              { id: 'approvals', label: 'Approvals' },
              { id: 'finance', label: 'Finance' },
              { id: 'support', label: 'Support' },
              { id: 'users', label: 'Users' },
              { id: 'restaurants', label: 'Restaurants' },
              { id: 'settings', label: 'Settings' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 relative group/tab ${activeTab === tab.id
                  ? 'bg-white text-orange-600 shadow-xl shadow-slate-200/50 scale-105'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white/70'}`}
              >
                {activeTab === tab.id && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-600 rounded-full" />
                )}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-8 md:p-12">

            {/* ─── OVERVIEW ─── */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {stats?.unapprovedRestaurants > 0 && (
                  <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-4">
                      <AlertCircle className="text-amber-600" size={24} />
                      <div>
                        <p className="font-black text-amber-900 uppercase tracking-widest text-xs">{stats.unapprovedRestaurants} Restaurants Pending Approval</p>
                        <p className="text-[10px] text-amber-600 font-bold uppercase mt-0.5">They won't appear on the home page until verified.</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('restaurants')} className="bg-amber-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all">
                      Review Now
                    </button>
                  </div>
                )}

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* Traffic Chart */}
                  <div className="lg:col-span-2 p-10 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Order Volume</h4>
                        <p className="text-[10px] text-orange-500 font-bold uppercase mt-1">Last 12 Transactions</p>
                      </div>
                      <ArrowUpRight className="text-orange-500" />
                    </div>
                    <div className="h-40 flex items-end gap-3 mb-6">
                      {ordersList.slice(0, 12).reverse().map((order, i) => {
                        const maxVal = Math.max(...ordersList.map(o => o.total || 1), 1);
                        const height = ((order.total || 0) / maxVal) * 100;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar relative">
                            <div
                              style={{ height: `${Math.max(height, 5)}%` }}
                              className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-xl opacity-90 transition-all hover:scale-110 hover:opacity-100 cursor-help"
                            >
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-2 py-1 rounded-lg text-[8px] font-black opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-30 shadow-xl border border-slate-100">
                                ₹{order.total}
                              </div>
                            </div>
                            <p className="text-[8px] font-bold text-slate-500 truncate w-full text-center">{(order.orderId || order._id)?.slice(-4)}</p>
                          </div>
                        );
                      })}
                      {ordersList.length === 0 && [40, 70, 45, 90, 65, 80, 40, 60, 55, 75, 50, 85].map((h, i) => (
                        <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-slate-800 rounded-xl opacity-30" />
                      ))}
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Real-time platform activity monitoring via recent transactions</p>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 flex flex-col gap-6 shadow-sm">
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Quick Actions</h4>
                    <div className="space-y-3">
                      <button onClick={() => setActiveTab('live')} className="w-full flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100 group hover:bg-orange-600 transition-all">
                        <span className="text-[10px] font-black uppercase text-orange-700 group-hover:text-white">Live Tracking</span>
                        <ArrowUpRight size={14} className="text-orange-500 group-hover:text-white" />
                      </button>
                      <button onClick={() => setActiveTab('restaurants')} className="w-full flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100 group hover:bg-purple-600 transition-all">
                        <span className="text-[10px] font-black uppercase text-purple-700 group-hover:text-white">Restaurant Portal</span>
                        <ArrowUpRight size={14} className="text-purple-500 group-hover:text-white" />
                      </button>
                      <Link to="/admin/menu" className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100 group hover:bg-blue-600 transition-all">
                        <span className="text-[10px] font-black uppercase text-blue-700 group-hover:text-white">Global Menu</span>
                        <ArrowUpRight size={14} className="text-blue-500 group-hover:text-white" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Platform Health Snapshot */}
                <div className="grid lg:grid-cols-3 gap-8">
                  <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex flex-col justify-between group">
                    <div>
                      <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6">Delivery Performance</h4>
                      <div className="flex items-end justify-between mb-4">
                        <h3 className="text-4xl font-black text-slate-900">98.2%</h3>
                        <span className="text-emerald-500 font-black text-xs flex items-center gap-1"><TrendingUp size={14} /> +2.4%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98.2%' }} />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-6 uppercase tracking-widest">Avg. Delivery: 24 mins</p>
                  </div>

                  <div className="lg:col-span-2 p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm relative overflow-hidden group">
                    <div className="relative z-10 grid grid-cols-3 gap-10">
                      <div>
                        <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-2">Total Volume</h4>
                        <p className="text-3xl font-black text-slate-900">₹{stats?.totalRevenue?.toLocaleString() || '0'}</p>
                        <div className="mt-4 flex gap-1">
                          {[3, 5, 2, 8, 4, 6, 9].map((v, i) => (
                            <div key={i} style={{ height: `${v * 2}px` }} className="w-1.5 bg-slate-100 rounded-full" />
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-2">Platform Cut</h4>
                        <p className="text-3xl font-black text-orange-600">₹{stats?.totalCommission?.toLocaleString() || '0'}</p>
                        <p className="text-[10px] text-slate-400 font-black mt-2">20% COMMISSION</p>
                      </div>
                      <div className="flex flex-col justify-center">
                        <button onClick={() => setActiveTab('finance')} className="bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl">
                          Full Reports
                        </button>
                      </div>
                    </div>
                    <Building size={150} className="absolute -bottom-10 -right-10 text-slate-50 -rotate-12 group-hover:scale-110 transition-transform duration-1000" />
                  </div>
                </div>

                {/* Status Cards */}
                <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-8">Infrastructure Health</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest p-5 bg-white rounded-2xl border border-slate-100 text-emerald-600 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" /> Core System: Operational
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest p-5 bg-white rounded-2xl border border-slate-100 text-blue-600 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-600" /> Gateway: Secure
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest p-5 bg-white rounded-2xl border border-slate-100 text-indigo-600 shadow-sm">
                      <Truck size={12} /> Active Couriers: {ridersList.length}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── INTELLIGENCE ─── */}
            {activeTab === 'intelligence' && <AdminBI />}

            {/* ─── GPS LIVE MAP ─── */}
            {activeTab === 'gps' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">Live GPS Fleet Map</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                      {onlineRiders.length} rider{onlineRiders.length !== 1 ? 's' : ''} online
                    </p>
                  </div>
                  <button onClick={fetchOnlineRiders} className="px-5 py-2.5 bg-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-all flex items-center gap-2">
                    <Wifi size={12} /> Refresh
                  </button>
                </div>

                {/* Map Panel */}
                {onlineRiders.filter(r => r.location).length > 0 ? (
                  <div className="relative rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm" style={{ height: '480px' }}>
                    <LeafletFleetMap riders={onlineRiders} activeOrders={activeOrders} />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg z-[1000] border border-slate-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      Live Fleet Tracker
                    </div>
                  </div>
                ) : (
                  <div className="h-64 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center justify-center gap-4">
                    <MapPin size={36} className="text-slate-300" />
                    <p className="font-black text-slate-400 text-[10px] uppercase tracking-widest">No rider locations available yet</p>
                    <p className="text-slate-400 text-xs">Riders must be online and have shared their GPS position</p>
                  </div>
                )}

                {/* Online Riders List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {onlineRiders.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-400">
                      <Truck size={28} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-black text-[10px] uppercase tracking-widest">No riders currently online</p>
                    </div>
                  ) : onlineRiders.map(rider => (
                    <div key={rider.userId || rider._id} className="p-5 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                          <Truck size={18} className="text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-sm truncate">{rider.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{rider.vehicleType || 'Bike'} • ★ {rider.rating || '4.5'}</p>
                          <div className="mt-2 flex items-center gap-1.5">
                            {rider.location ? (
                              <><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                              <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest">GPS Active</span></>
                            ) : (
                              <><span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">No GPS Yet</span></>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── LIVE ORDERS ─── */}
            {activeTab === 'live' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">Live Order Tracker</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Real-time updates via Socket.IO</p>
                  </div>
                  <button onClick={fetchData} className="px-5 py-2.5 bg-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-all">
                    Refresh
                  </button>
                </div>

                {activeOrders.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <ShoppingCart className="text-slate-300 mx-auto mb-4" size={40} />
                    <p className="font-black text-slate-900 text-xl mb-2">No active orders</p>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">New orders will appear here in real-time</p>
                  </div>
                ) : (
                  activeOrders.map((order) => (
                    <div key={order._id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs ${order.orderStatus === 'on_the_way' ? 'bg-indigo-500 animate-pulse' :
                            order.orderStatus === 'preparing' ? 'bg-orange-500' : 'bg-blue-500'
                            }`}>
                            {order.orderStatus === 'on_the_way' ? <Truck size={18} /> : order.orderStatus?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">Order #{(order.orderId || order._id)?.slice(-8)}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{order.restaurant?.name} • ₹{order.total}</p>
                            <p className="text-[10px] text-slate-500 font-bold mt-1">Customer: {order.customer?.name || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Rider Info */}
                        <div className="flex flex-col items-start md:items-center gap-1">
                          {order.rider ? (
                            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl">
                              <Truck size={14} className="text-indigo-600" />
                              <div>
                                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{order.rider?.name || 'Rider Assigned'}</p>
                                {order.rider?.phone && <p className="text-[10px] text-indigo-400 font-bold">{order.rider.phone}</p>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                              Pending Assignment
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Manual Rider Assignment Dropdown */}
                          {!order.rider && (
                            <div className="relative">
                              <select
                                onChange={async (e) => {
                                  const riderId = e.target.value;
                                  if (!riderId) return;
                                  try {
                                    const res = await API.post(`/admin/orders/${order._id}/assign`, { riderId });
                                    addToast(`🛵 Assigned to rider!`, 'success');
                                    // Update the local state instead of just fetchData()
                                    const updatedOrder = res.data.data;
                                    setOrdersList(prev => prev.map(o => o._id === order._id ? updatedOrder : o));
                                    fetchNotifications();
                                  } catch (err) {
                                    console.error('Assignment failed:', err);
                                    addToast(err.response?.data?.message || 'Failed to assign rider', 'error');
                                  }
                                }}
                                className="bg-orange-50 text-orange-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-orange-200 focus:ring-1 focus:ring-orange-500 outline-none cursor-pointer"
                              >
                                <option value="">Assign Rider</option>
                                {ridersList.map(r => (
                                  <option key={r._id} value={r._id}>{r.name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[order.orderStatus] || 'bg-slate-100 text-slate-600'}`}>
                            {order.orderStatus?.replace('_', ' ')}
                          </span>
                          {/* Admin can manually change status */}
                          <select
                            value={order.orderStatus}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              try {
                                await API.put(`/orders/${order._id}/status`, { status: newStatus });
                                setOrdersList(prev => prev.map(item => item._id === order._id ? { ...item, orderStatus: newStatus } : item));
                                addToast(`✅ Order #${(order.orderId || order._id)?.slice(-6)} → ${newStatus}`, 'info');
                                fetchNotifications();
                              } catch (err) {
                                const msg = err.response?.data?.message || 'Failed to update status';
                                addToast(`⚠️ ${msg}`, 'error');
                                console.error('Update failed:', err);
                              }
                            }}
                            className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-orange-500 outline-none cursor-pointer"
                          >
                            {['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered', 'cancelled'].map(s => (
                              <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                          </select>
                          {/* Quick Cancel button */}
                          {!['delivered', 'cancelled'].includes(order.orderStatus) && (
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Cancel Order #${(order.orderId || order._id)?.slice(-6)}?`)) return;
                                try {
                                  await API.put(`/orders/${order._id}/status`, { status: 'cancelled' });
                                  setOrdersList(prev => prev.map(item => item._id === order._id ? { ...item, orderStatus: 'cancelled' } : item));
                                  addToast(`🚫 Order #${(order.orderId || order._id)?.slice(-6)} cancelled`, 'info');
                                  fetchNotifications();
                                } catch (err) {
                                  addToast(err.response?.data?.message || 'Failed to cancel order', 'error');
                                }
                              }}
                              className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                            >
                              Cancel
                            </button>
                          )}
                          <Link to={`/order/${order._id}`} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-orange-600 transition-all">
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ─── ALL ORDERS ─── */}
            {activeTab === 'orders' && (
              <div className="overflow-x-auto space-y-6">
                <div className="flex justify-end mb-4">
                  <button onClick={handleExportCSV} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl active:scale-95 flex items-center gap-2">
                    <TrendingUp size={16} /> Export Orders CSV
                  </button>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                      <th className="pb-6 px-4">Order</th>
                      <th className="pb-6">Price</th>
                      <th className="pb-6">Rider</th>
                      <th className="pb-6">Status</th>
                      <th className="pb-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ordersList.map((o) => (
                      <tr key={o._id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-6 px-4">
                          <p className="font-black text-slate-900 text-sm">#{(o.orderId || o._id)?.slice(-8)}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{o.restaurant?.name || 'Restaurant'}</p>
                          <p className="text-[10px] text-slate-500 font-bold">{o.customer?.name}</p>
                        </td>
                        <td className="py-6">
                          <p className="font-black text-slate-900">₹{o.total?.toFixed(0)}</p>
                        </td>
                        <td className="py-6">
                          {o.rider ? (
                            <div className="flex items-center gap-2">
                              <Truck size={12} className="text-indigo-500" />
                              <div>
                                <p className="font-black text-slate-800 text-xs">{o.rider?.name || 'Assigned'}</p>
                                {o.rider?.phone && <p className="text-[10px] text-slate-400 font-bold">{o.rider.phone}</p>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-black uppercase tracking-widest">No Rider</span>
                          )}
                        </td>
                        <td className="py-6">
                          <select
                            value={o.orderStatus}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              try {
                                await useOrderStore.getState().updateStatus(o._id, newStatus);
                                setOrdersList(prev => prev.map(item => item._id === o._id ? { ...item, orderStatus: newStatus } : item));
                              } catch (err) {
                                console.error('Update failed:', err);
                              }
                            }}
                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-orange-500 outline-none cursor-pointer ${STATUS_COLORS[o.orderStatus] || 'bg-slate-100 text-slate-600'}`}
                          >
                            {['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered', 'cancelled'].map(s => (
                              <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-6 text-right">
                          <Link to={`/order/${o._id}`} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-600 hover:text-orange-600 hover:border-orange-200 transition-all">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ─── USERS ─── */}
            {activeTab === 'users' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">Platform Users</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">Manage permissions and access</p>
                  </div>
                  <button
                    onClick={() => setShowAddUser(!showAddUser)}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl active:scale-95"
                  >
                    {showAddUser ? <X size={16} /> : <Plus size={16} />}
                    {showAddUser ? 'Cancel' : 'Create New User'}
                  </button>
                </div>

                {showAddUser && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setIsSubmittingUser(true);
                      try {
                        const res = await API.post('/auth/register', newUserForm);
                        setUsersList(prev => [res.data.user, ...prev]);
                        addToast('👤 User created successfully!', 'info');
                        fetchNotifications();
                        setShowAddUser(false);
                        setNewUserForm({ name: '', email: '', password: '', role: 'customer' });
                      } catch (err) {
                        addToast(err.response?.data?.message || 'Failed to create user', 'error');
                      } finally {
                        setIsSubmittingUser(false);
                      }
                    }}
                    className="bg-white p-10 rounded-[2.5rem] border-2 border-orange-100 shadow-2xl animate-fade-up"
                  >
                    <h4 className="font-black text-2xl mb-8 flex items-center gap-4 text-slate-900">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Users size={24} />
                      </div>
                      User Registration
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Full Name</label>
                          <input
                            required
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                            placeholder="John Doe"
                            value={newUserForm.name}
                            onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Email Address</label>
                          <input
                            required
                            type="email"
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                            placeholder="user@example.com"
                            value={newUserForm.email}
                            onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Password</label>
                          <div className="relative">
                            <input
                              required
                              type={showUserPass ? 'text' : 'password'}
                              minLength={6}
                              className="w-full bg-slate-50 border border-slate-100 pl-6 pr-12 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                              placeholder="••••••••"
                              value={newUserForm.password}
                              onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => setShowUserPass(!showUserPass)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-600 transition-colors"
                            >
                              {showUserPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Account Role</label>
                          <select
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all cursor-pointer"
                            value={newUserForm.role}
                            onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}
                          >
                            <option value="customer">Customer (User)</option>
                            <option value="rider">Rider (Delivery)</option>
                            <option value="restaurant">Restaurant (Partner)</option>
                            <option value="admin">Admin (Staff)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={isSubmittingUser}
                      className="w-full mt-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-50 transition-all"
                    >
                      {isSubmittingUser ? 'Creating Account...' : 'Add User to Platform'}
                    </button>
                  </form>
                )}

                <div className="flex flex-wrap gap-2 pb-2">
                  {['all', 'customer', 'restaurant', 'rider', 'admin'].map(r => (
                    <button
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${roleFilter === r ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {r}s
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto bg-white rounded-[2rem] border border-slate-100">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                        <th className="pb-6 px-4">User</th>
                        <th className="pb-6">Role</th>
                        <th className="pb-6">Wallet</th>
                        <th className="pb-6 text-center">Status</th>
                        <th className="pb-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {usersList
                        .filter(u => roleFilter === 'all' || u.role === roleFilter)
                        .map((u) => (
                          <tr key={u._id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-6 px-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 uppercase">
                                  {u.name?.[0]}
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 text-sm">{u.name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-6">
                              <select
                                value={u.role}
                                onChange={async (e) => {
                                  const newRole = e.target.value;
                                  try {
                                    await API.put(`/admin/users/${u._id}`, { role: newRole });
                                    setUsersList(prev => prev.map(usr => usr._id === u._id ? { ...usr, role: newRole } : usr));
                                    addToast(`🎭 Role updated to ${newRole}`, 'info');
                                  } catch (err) {
                                    console.error('Failed to update role:', err);
                                    addToast('Role update failed. Please try again.', 'error');
                                  }
                                }}
                                className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl outline-none cursor-pointer border-none shadow-sm transition-all active:scale-95 ${u.role === 'admin' ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' :
                                  u.role === 'rider' ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' :
                                    u.role === 'restaurant' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' :
                                      'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                  }`}
                              >
                                <option value="customer">Customer</option>
                                <option value="rider">Rider</option>
                                <option value="restaurant">Partner</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="py-6">
                              <p className="font-black text-slate-900 text-xs">₹{u.wallet?.balance?.toLocaleString() || 0}</p>
                            </td>
                            <td className="py-6 text-center">
                              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.isActive !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {u.isActive !== false ? 'Active' : 'Blocked'}
                              </span>
                            </td>
                            <td className="py-6 text-right">
                              <button
                                onClick={async () => {
                                  try {
                                    const newStatus = u.isActive === false ? true : false;
                                    await API.put(`/admin/users/${u._id}`, { isActive: newStatus });
                                    setUsersList(prev => prev.map(usr => usr._id === u._id ? { ...usr, isActive: newStatus } : usr));
                                    addToast(`👤 User ${newStatus ? 'enabled' : 'blocked'}`, 'info');
                                  } catch (err) {
                                    console.error('Failed to update user status:', err);
                                  }
                                }}
                                className={`text-[9px] font-black uppercase tracking-[0.1em] px-4 py-2 rounded-xl transition-all ${u.isActive !== false ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                              >
                                {u.isActive !== false ? 'Block' : 'Enable'}
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to PERMANENTLY delete ${u.name}? This cannot be undone.`)) {
                                    try {
                                      await API.delete(`/admin/users/${u._id}`);
                                      setUsersList(prev => prev.filter(usr => usr._id !== u._id));
                                      addToast(`🗑️ User deleted`, 'info');
                                    } catch (err) {
                                      console.error('Failed to delete user:', err);
                                      addToast('Delete failed. Please try again.', 'error');
                                    }
                                  }
                                }}
                                className="p-2 text-rose-300 hover:text-rose-600 transition-colors ml-2"
                                title="Delete User Permanently"
                              >
                                <Trash2 size={16} />
                              </button>
                              <button
                                onClick={async () => {
                                  const amount = window.prompt("Enter amount to adjust (e.g. 100 for credit, -100 for debit):");
                                  if (!amount) return;

                                  const numAmount = Number(amount);
                                  if (isNaN(numAmount) || numAmount <= 0) {
                                    addToast('Please enter a valid amount.', 'error');
                                    return;
                                  }

                                  const reason = window.prompt("Reason for adjustment:");
                                  if (!reason) return;

                                  try {
                                    const type = numAmount > 0 ? 'credit' : 'debit';
                                    const absAmount = Math.abs(numAmount);

                                    await API.post('/wallet/manual', {
                                      targetUserId: u._id,
                                      amount: absAmount,
                                      type,
                                      description: reason
                                    });

                                    // Update local state
                                    setUsersList(prev => prev.map(usr =>
                                      usr._id === u._id
                                        ? { ...usr, wallet: { ...usr.wallet, balance: (usr.wallet?.balance || 0) + numAmount } }
                                        : usr
                                    ));

                                    addToast(`💰 Wallet adjusted for ${u.name}`, 'info');
                                    fetchAllTransactions(); // Refresh audit log if visible
                                  } catch (err) {
                                    console.error('Wallet adjustment failed:', err);
                                    addToast(err.response?.data?.message || 'Adjustment failed', 'error');
                                  }
                                }}
                                className="p-2 text-blue-400 hover:text-blue-600 transition-colors ml-2"
                                title="Adjust Wallet Balance"
                              >
                                <DollarSign size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── RESTAURANTS ─── */}
            {activeTab === 'restaurants' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">Manage Kitchens</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">Add or remove restaurant partners</p>
                  </div>
                  <button
                    onClick={() => {
                      if (showAddRestaurant) {
                        setShowAddRestaurant(false);
                        setEditingId(null);
                      } else {
                        setNewRestaurantForm({ name: '', description: '', image: '', cuisines: '', address: '', city: '', ownerId: '' });
                        setShowAddRestaurant(true);
                      }
                    }}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl active:scale-95"
                  >
                    {showAddRestaurant ? <X size={16} /> : <Plus size={16} />}
                    {showAddRestaurant ? 'Cancel' : 'Add New Restaurant'}
                  </button>
                </div>

                {showAddRestaurant && (
                  <form onSubmit={handleCreateRestaurant} className="bg-white p-10 rounded-[2.5rem] border-2 border-orange-100 shadow-2xl animate-fade-up">
                    <h4 className="font-black text-2xl mb-8 flex items-center gap-4 text-slate-900">
                      <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                        <Building size={24} />
                      </div>
                      {editingId ? 'Edit Restaurant' : 'Restaurant Registration'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Display Name</label>
                          <input
                            required
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                            placeholder="e.g. Punjabi Tadka"
                            value={newRestaurantForm.name}
                            onChange={e => setNewRestaurantForm({ ...newRestaurantForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <ImageUploadField
                            label="Restaurant Banner"
                            value={newRestaurantForm.image}
                            onChange={(url) => setNewRestaurantForm({ ...newRestaurantForm, image: url })}
                            icon={Building}
                            required
                            hint="Upload a photo for the restaurant banner"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Cuisines (comma separated)</label>
                          <input
                            required
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                            placeholder="North Indian, Chinese, Mughlai"
                            value={newRestaurantForm.cuisines}
                            onChange={e => setNewRestaurantForm({ ...newRestaurantForm, cuisines: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Assign Owner (Optional)</label>
                          <select
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all cursor-pointer"
                            value={newRestaurantForm.ownerId}
                            onChange={e => setNewRestaurantForm({ ...newRestaurantForm, ownerId: e.target.value })}
                          >
                            <option value="">No Owner Assigned</option>
                            {usersList.map(u => (
                              <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Commission Percentage (%)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                            placeholder="10"
                            value={newRestaurantForm.commissionPercentage}
                            onChange={e => setNewRestaurantForm({ ...newRestaurantForm, commissionPercentage: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Public Description</label>
                          <textarea
                            required
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all resize-none"
                            placeholder="Authentic flavors from the heart of Punjab..."
                            value={newRestaurantForm.description}
                            onChange={e => setNewRestaurantForm({ ...newRestaurantForm, description: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Street Address</label>
                            <input
                              required
                              className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                              placeholder="123 Food Street"
                              value={newRestaurantForm.address}
                              onChange={e => setNewRestaurantForm({ ...newRestaurantForm, address: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">City</label>
                            <input
                              required
                              className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                              placeholder="New Delhi"
                              value={newRestaurantForm.city}
                              onChange={e => setNewRestaurantForm({ ...newRestaurantForm, city: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={isSubmittingRest}
                      className="w-full mt-10 py-5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-orange-200 active:scale-95 disabled:opacity-50 transition-all"
                    >
                      {isSubmittingRest ? 'Saving Changes...' : (editingId ? 'Update Restaurant' : 'Register Restaurant')}
                    </button>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {restaurantsList.map((r) => (
                    <div key={r._id} className="bg-white rounded-[2.5rem] border border-slate-100 flex flex-col group hover:shadow-2xl hover:shadow-slate-200/50 transition-all overflow-hidden relative">
                      {/* Banner at top */}
                      <div className="h-40 overflow-hidden relative group">
                        <img src={r.image || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent flex items-end p-6">
                          <div>
                            <h4 className="font-black text-white text-xl leading-tight">{r.name}</h4>
                            <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.15em] mt-1">{r.cuisines?.join(', ') || 'Multi-cuisine'}</p>
                          </div>
                        </div>
                        <div className="absolute top-4 right-4 animate-in slide-in-from-right-4 duration-500">
                          <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest backdrop-blur-md border ${r.isApproved ? 'bg-emerald-500/80 text-white border-emerald-400' : 'bg-amber-500/80 text-white border-amber-400'}`}>
                            {r.isApproved ? 'Verified' : 'Reviewing'}
                          </span>
                        </div>
                      </div>

                      <div className="p-8 space-y-6">
                        <div className="flex gap-4">
                          <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest bg-orange-50 px-3 py-1.5 rounded-xl">📍 {r.location?.city || 'Local'}</p>
                          {r.owner && (
                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-xl">👤 Owner: {r.owner.name || 'Assigned'}</p>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <Link
                            to={`/admin/menu?restaurantId=${r._id}`}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all text-center flex items-center justify-center gap-2 shadow-lg active:scale-95"
                          >
                            <Edit3 size={14} /> Manage Menu
                          </Link>
                          <button
                            onClick={() => {
                              setEditingId(r._id);
                              setNewRestaurantForm({
                                name: r.name,
                                description: r.description,
                                image: r.image,
                                cuisines: r.cuisines?.join(', ') || '',
                                address: r.location?.address || '',
                                city: r.location?.city || '',
                                ownerId: r.owner?._id || r.owner || '',
                                commissionPercentage: r.commissionPercentage || 10
                              });
                              setShowAddRestaurant(true);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-14 h-14 flex items-center justify-center bg-white border border-slate-100 text-slate-600 rounded-2xl hover:bg-blue-50 hover:border-blue-100 transition-all shadow-sm active:scale-95"
                            title="Edit Restaurant"
                          >
                            <Edit3 size={20} />
                          </button>
                          <button
                            onClick={() => handleDeleteRestaurant(r._id)}
                            className="w-14 h-14 flex items-center justify-center bg-white border border-slate-100 text-rose-500 rounded-2xl hover:bg-rose-50 hover:border-rose-100 transition-all shadow-sm active:scale-95"
                            title="Delete Restaurant"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>

                        {!r.isApproved && (
                          <button
                            onClick={async () => {
                              try {
                                await API.put(`/admin/restaurants/${r._id}/approve`, {});
                                setRestaurantsList(prev => prev.map(rest => rest._id === r._id ? { ...rest, isApproved: true } : rest));
                                addToast(`✅ ${r.name} approved!`, 'info');
                                fetchNotifications(); // Sync stats & badge counts
                              } catch (err) {
                                console.error('Approval failed:', err);
                              }
                            }}
                            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
                          >
                            Approve Partner
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── APPROVALS ─── */}
            {activeTab === 'approvals' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">Partner Applications</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">Review and verify new restaurant registrations</p>
                  </div>
                </div>

                {restaurantsList.filter(r => !r.isApproved).length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <CheckCircle className="text-emerald-300 mx-auto mb-4" size={40} />
                    <p className="font-black text-slate-900 text-xl mb-2">Maximum Efficiency!</p>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">No pending applications at the moment</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {restaurantsList.filter(r => !r.isApproved).map((r) => (
                      <div key={r._id} className="bg-white rounded-[2.5rem] border-2 border-amber-100 flex flex-col group hover:shadow-2xl hover:shadow-amber-100/50 transition-all overflow-hidden relative animate-fade-up">
                        <div className="h-40 overflow-hidden relative">
                          <img src={r.image || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&q=80'} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent flex items-end p-6">
                            <div>
                              <h4 className="font-black text-white text-xl leading-tight">{r.name}</h4>
                              <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.15em] mt-1">{r.cuisines?.join(', ') || 'Multi-cuisine'}</p>
                            </div>
                          </div>
                          <div className="absolute top-4 right-4">
                            <span className="text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest bg-amber-500 text-white shadow-lg border border-amber-400">
                              Pending Review
                            </span>
                          </div>
                        </div>

                        <div className="p-8 space-y-6">
                          <div className="flex flex-wrap gap-2">
                            <p className="text-[9px] text-orange-600 font-black bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">📍 {r.location?.city || 'Local'}</p>
                            {r.owner && (
                              <p className="text-[9px] text-blue-600 font-black bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">👤 {r.owner.name || 'Owner Assigned'}</p>
                            )}
                          </div>

                          <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">"{r.description || 'No description provided'}"</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">FSSAI License</p>
                                <p className="text-[10px] font-bold text-slate-700">{r.fssaiLicense || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GSTIN</p>
                                <p className="text-[10px] font-bold text-slate-700">{r.gstin || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PAN Number</p>
                                <p className="text-[10px] font-bold text-slate-700">{r.panNumber || 'N/A'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Address</p>
                                <p className="text-[10px] font-bold text-slate-700 italic truncate" title={r.location?.address}>{r.location?.address}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={async () => {
                                try {
                                  await API.put(`/admin/restaurants/${r._id}/approve`, {});
                                  setRestaurantsList(prev => prev.map(rest => rest._id === r._id ? { ...rest, isApproved: true } : rest));
                                  addToast(`✨ ${r.name} is now a partner!`, 'info');
                                  fetchNotifications(); // Sync stats & badge counts
                                  fetchData(); // Sync list
                                } catch (err) {
                                  console.error('Approval failed:', err);
                                  addToast('Approval failed: ' + (err.response?.data?.message || err.message), 'error');
                                }
                              }}
                              className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 transition-all active:scale-95"
                            >
                              Verify & Approve
                            </button>
                            <button
                              onClick={() => handleDeleteRestaurant(r._id)}
                              className="w-14 h-14 flex items-center justify-center bg-rose-50 text-rose-500 border border-rose-100 rounded-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                              title="Reject Application"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rider Columns */}
                {riderProfilesList.filter(r => r.status === 'PENDING').length > 0 && (
                  <div className="space-y-6 mt-12">
                    <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-200 pb-2">Delivery Rider Applications</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {riderProfilesList.filter(r => r.status === 'PENDING').map((r) => (
                        <div key={r._id} className="bg-white rounded-[2.5rem] border border-indigo-100 flex flex-col group hover:shadow-2xl hover:shadow-indigo-100/50 transition-all overflow-hidden relative animate-fade-up p-8">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-indigo-50 text-indigo-500 flex items-center justify-center rounded-2xl font-black text-xl">
                                <Truck size={24} />
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 text-xl leading-tight">{r.fullName || r.user?.name}</h4>
                                <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200 mt-1 inline-block">
                                  Rider App Review
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Vehicle Match</p>
                              <p className="font-black text-slate-700 capitalize">🚲 {r.vehicleType}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Vehicle No.</p>
                              <p className="font-black text-slate-700 uppercase">{r.vehicleNumber || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">License No.</p>
                              <p className="font-black text-slate-700 uppercase">{r.licenseNumber || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Aadhaar (UIDAI)</p>
                              <p className="font-black text-slate-700 tracking-wider">{(r.aadhaarDetails?.aadhaarNumber || r.aadhaarDetails || 'N/A')}</p>
                            </div>
                          </div>

                          <div className="flex gap-4 pt-4 border-t border-slate-50 mt-auto">
                            <button
                              onClick={async () => {
                                try {
                                  await API.put(`/admin/riders/${r._id}/approve`, {});
                                  setRiderProfilesList(prev => prev.map(rider => rider._id === r._id ? { ...rider, status: 'APPROVED' } : rider));
                                  addToast(`✅ Rider ${r.fullName} Approved!`, 'info');
                                  fetchNotifications(); // Sync stats & badge counts
                                } catch (err) {
                                  console.error('Approval failed:', err);
                                  addToast('❌ Approval failed.', 'error');
                                }
                              }}
                              className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                            >
                              Approve Rider
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to reject rider ${r.fullName}?`)) {
                                  addToast(`Rider rejection feature is coming soon.`, 'info');
                                }
                              }}
                              className="w-14 h-14 flex items-center justify-center bg-white border border-rose-200 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 hover:border-rose-300 transition-all active:scale-95"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── PLATFORM SETTINGS ─── */}
            {activeTab === 'settings' && (
              <div className="space-y-8 animate-fade-up">
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-6 mb-12">
                     <div className="w-16 h-16 bg-orange-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-orange-100">
                        <DollarSign size={32} />
                     </div>
                     <div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Economic Configuration</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Set platform fees, multipliers and commissions</p>
                     </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-8">
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 block">Base Delivery Fee</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">₹</span>
                        <input 
                          type="number" 
                          className="w-full pl-10 pr-6 py-4 bg-white border border-slate-100 rounded-2xl font-black text-xl text-slate-900 focus:border-orange-500 outline-none transition-all" 
                          value={platformSettings.baseDeliveryFee}
                          onChange={e => setPlatformSettings({...platformSettings, baseDeliveryFee: Number(e.target.value)})}
                        />
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold mt-4 italic">The starting fee for any delivery within 1.5km.</p>
                    </div>

                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 block">Per KM Charge</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">₹</span>
                        <input 
                          type="number" 
                          className="w-full pl-10 pr-6 py-4 bg-white border border-slate-100 rounded-2xl font-black text-xl text-slate-900 focus:border-orange-500 outline-none transition-all" 
                          value={platformSettings.perKmCharge}
                          onChange={e => setPlatformSettings({...platformSettings, perKmCharge: Number(e.target.value)})}
                        />
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold mt-4 italic">Additional charge added for every extra kilometer.</p>
                    </div>

                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 block">Platform Commission</label>
                      <div className="relative">
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">%</span>
                        <input 
                          type="number" 
                          className="w-full pl-6 pr-10 py-4 bg-white border border-slate-100 rounded-2xl font-black text-xl text-slate-900 focus:border-orange-500 outline-none transition-all" 
                          value={platformSettings.platformCommission}
                          onChange={e => setPlatformSettings({...platformSettings, platformCommission: Number(e.target.value)})}
                        />
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold mt-4 italic">The percentage shared with the platform from restaurant sales.</p>
                    </div>

                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4 block">Tax Rate (GST)</label>
                      <div className="relative">
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">%</span>
                        <input 
                          type="number" 
                          className="w-full pl-6 pr-10 py-4 bg-white border border-slate-100 rounded-2xl font-black text-xl text-slate-900 focus:border-orange-500 outline-none transition-all" 
                          value={platformSettings.taxRate || 5}
                          onChange={e => setPlatformSettings({...platformSettings, taxRate: Number(e.target.value)})}
                        />
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold mt-4 italic">The global tax percentage applied to each order subtotal.</p>
                    </div>
                  </div>

                  <div className="mt-12 flex justify-end">
                    <button 
                      onClick={handleUpdateSettings}
                      disabled={isUpdatingSettings}
                      className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-orange-600 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      <ShieldCheck size={18} /> {isUpdatingSettings ? 'Saving...' : 'Update Configuration'}
                    </button>
                  </div>
               </div>

                <div className="grid md:grid-cols-2 gap-8">
                   <div className="p-10 bg-slate-900 rounded-[2.5rem] border border-slate-800 text-white relative overflow-hidden group">
                      <h4 className="text-xl font-black mb-2 flex items-center gap-3"><Wifi className="text-emerald-500 animate-pulse" /> Real-time Nodes</h4>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-8">Platform connectivity and socket states</p>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                           <span className="text-[10px] font-black uppercase tracking-widest">Socket Latency</span>
                           <span className="text-emerald-500 font-black text-sm">24ms</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                           <span className="text-[10px] font-black uppercase tracking-widest">Active Heartbeats</span>
                           <span className="text-white font-black text-sm">Responsive</span>
                        </div>
                      </div>
                      <TrendingUp className="absolute -bottom-10 -right-10 w-40 h-40 text-white/5 opacity-50 group-hover:scale-125 transition-all duration-1000" />
                   </div>
                   
                   <div className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                      <h4 className="text-xl font-black text-slate-900 mb-2">Automated Payouts</h4>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8">Current Cycle: Weekly (Sunday midnight)</p>
                      <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center text-center">
                         <Clock size={32} className="text-slate-300 mb-4" />
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">System automatically initiates settlements via RazorpayX every Sunday at 23:59 IST</p>
                      </div>
                   </div>
                </div>
              </div>
            )}

            {/* ─── FINANCE ─── */}
            {activeTab === 'finance' && (
              <div className="space-y-8 animate-fade-up">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">Financial Reports</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1">Revenue breakdown and partner settlements</p>
                  </div>
                  <button onClick={handleExportCSV} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl active:scale-95 flex items-center gap-2">
                    <TrendingUp size={16} /> Export CSV
                  </button>
                  <div className="flex gap-8">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Sales</p>
                      <p className="text-xl font-black text-slate-900">₹{financeData.totalGrossRevenue?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest text-xs">Unsettled (COD/Pend)</p>
                      <p className="text-xl font-black text-amber-600">₹{financeData.pendingRevenue?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest text-xs">Total Orders</p>
                      <p className="text-xl font-black text-slate-900">{financeData.totalOrders || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest text-xs">Avg. Order</p>
                      <p className="text-xl font-black text-slate-900">₹{financeData.averageOrderValue?.toFixed(0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Admin Profit</p>
                      <p className="text-xl font-black text-emerald-600">₹{financeData.totalCommission?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Earnings Chart */}
                <div className="p-10 bg-slate-900 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-20">
                    <TrendingUp size={120} />
                  </div>
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-[0.2em] text-orange-400">Revenue Velocity</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Weekly aggregate totals</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live Reports</span>
                    </div>
                  </div>
                  <div className="h-48 flex items-end gap-4 relative z-10">
                    {financeData.weeklyReport?.map((val, i) => {
                      const maxFin = Math.max(...financeData.weeklyReport, 1);
                      const height = (val / maxFin) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-4">
                          <div
                            style={{ height: `${Math.max(height, 2)}%` }}
                            className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-2xl min-h-[4px] relative group hover:scale-105 transition-all cursor-pointer shadow-[0_0_20px_rgba(234,88,12,0.2)]"
                          >
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-3 py-1.5 rounded-xl text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all shadow-2xl scale-90 group-hover:scale-100 whitespace-nowrap z-30 transform -translate-y-2 group-hover:translate-y-0">
                              ₹{val.toLocaleString()}
                            </div>
                          </div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            {i === 6 ? 'Today' : i === 5 ? 'Yest' : `${6 - i}d ago`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Settlement Table */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Partner Settlements</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans">
                      <thead>
                        <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                          <th className="py-6 px-10">Restaurant</th>
                          <th className="py-6">Gross Sales</th>
                          <th className="py-6">Commission</th>
                          <th className="py-6">Net Payout</th>
                          <th className="py-6">Pending (COD)</th>
                          <th className="py-6 px-10 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {financeData.settlements?.map((s, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-6 px-10">
                              <p className="font-black text-slate-900 text-sm">{s.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.totalOrders} Orders</p>
                            </td>
                            <td className="py-6 font-black text-slate-900">₹{s.gross.toLocaleString()}</td>
                            <td className="py-6 font-black text-rose-500">-₹{s.commission.toLocaleString()}</td>
                            <td className="py-6 font-black text-emerald-600">₹{s.net.toLocaleString()}</td>
                            <td className="py-6 font-black text-amber-600">₹{(s.pending || 0).toLocaleString()}</td>
                            <td className="py-6 px-10 text-right">
                              <button
                                onClick={() => {
                                  if (window.confirm(`Process payout of ₹${s.net.toLocaleString()} for ${s.name}?`)) {
                                    addToast(`💸 Payout of ₹${s.net.toLocaleString()} processed for ${s.name}!`, 'info');
                                    fetchNotifications();
                                  }
                                }}
                                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg"
                              >
                                Process Payout
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mt-8">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">System Transaction Log (Audit)</h4>
                    <span className="text-[9px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-xl uppercase tracking-widest">Real-time Feed</span>
                  </div>
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left font-sans">
                      <thead>
                        <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                          <th className="py-6 px-10">User / Role</th>
                          <th className="py-6">Description</th>
                          <th className="py-6">Method</th>
                          <th className="py-6">Amount</th>
                          <th className="py-6">Status</th>
                          <th className="py-6 px-10 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {allTransactions.map((txn) => (
                          <tr key={txn._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-6 px-10">
                              <p className="font-black text-slate-900 text-sm">{txn.user?.name || 'Deleted User'}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{txn.user?.role || 'unknown'}</p>
                            </td>
                            <td className="py-6">
                              <p className="text-xs font-bold text-slate-600 line-clamp-1">{txn.description}</p>
                              <p className="text-[9px] text-slate-400 font-bold font-mono">#{txn.transactionId?.slice(-12)}</p>
                            </td>
                            <td className="py-6">
                              <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-xl text-slate-600 border border-slate-200">{txn.paymentMethod || 'other'}</span>
                            </td>
                            <td className="py-6">
                              <p className={`font-black text-sm ${txn.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {txn.type === 'credit' ? '+' : '-'}₹{txn.amount?.toLocaleString()}
                              </p>
                            </td>
                            <td className="py-6">
                              <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${txn.status === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                {txn.status}
                              </span>
                            </td>
                            <td className="py-6 px-10 text-right text-[10px] font-black text-slate-400">
                              {new Date(txn.createdAt).toLocaleDateString()}
                              <br />
                              {new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ─── SUPPORT TICKETS ─── */}
            {activeTab === 'support' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-xl text-slate-900">Help Desk Management</h3>
                  <div className="flex gap-2">
                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {supportTickets.filter(t => t.status === 'open').length} Open
                    </span>
                  </div>
                </div>

                {supportTickets.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <AlertCircle className="text-slate-300 mx-auto mb-4" size={40} />
                    <p className="font-black text-slate-900 text-xl mb-2">No support tickets</p>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Customer and rider problems will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {supportTickets.map(ticket => (
                      <div key={ticket._id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black uppercase text-[10px] ${ticket.role === 'rider' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'
                              }`}>
                              {ticket.role}
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <h5 className="font-black text-lg text-slate-900">{ticket.subject}</h5>
                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${ticket.priority === 'urgent' ? 'bg-rose-100 text-rose-600 animate-pulse' :
                                  ticket.priority === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                  {ticket.priority}
                                </span>
                              </div>
                              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                                {ticket.user?.name} ({ticket.user?.phone || 'No phone'}) • {new Date(ticket.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex-1 px-6">
                            <p className="text-slate-500 text-sm font-medium">"{ticket.message}"</p>
                            {ticket.order && (
                              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2">Order: #{ticket.order.orderId || 'N/A'}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <select
                              value={ticket.status}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                try {
                                  await API.put(`/support/${ticket._id}/status`, { status: newStatus });
                                  setSupportTickets(prev => prev.map(t => t._id === ticket._id ? { ...t, status: newStatus } : t));
                                } catch (err) {
                                  addToast('Failed to update ticket status', 'error');
                                }
                              }}
                              className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl outline-none cursor-pointer border-none shadow-sm ${ticket.status === 'open' ? 'bg-amber-50 text-amber-600' :
                                ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                }`}
                            >
                              <option value="open">Open</option>
                              <option value="pending">Pending</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── NOTIFICATIONS ─── */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="font-black text-xl text-slate-900">Platform Notifications</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Stay updated with system events</p>
                  </div>
                  {persistentNotifications.length > 0 && (
                    <button
                      onClick={handleClearNotifications}
                      className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-200"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {persistentNotifications.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <Bell className="text-slate-300 mx-auto mb-4" size={40} />
                    <p className="font-black text-slate-900 text-xl mb-2">No notifications yet</p>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">New updates will appear here</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {persistentNotifications.map(notif => (
                      <div key={notif._id} className={`p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-start gap-6 relative overflow-hidden group ${!notif.read ? 'border-l-4 border-l-orange-500' : ''}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                          notif.type === 'error' ? 'bg-rose-50 text-rose-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>
                          <Bell size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-black text-slate-900 text-lg leading-tight">{notif.title}</h4>
                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{new Date(notif.createdAt).toLocaleString()}</p>
                          </div>
                          <p className="text-slate-500 text-sm font-medium mt-1 leading-relaxed">{notif.message}</p>
                          {notif.orderId && (
                            <Link to={`/order/${notif.orderId}`} className="inline-flex items-center gap-2 mt-4 text-[10px] font-black text-orange-600 uppercase tracking-widest hover:gap-3 transition-all">
                              View Related Order <ArrowRight size={12} className="ml-1" />
                            </Link>
                          )}
                        </div>
                        {!notif.read && (
                          <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}


          </div>
        </div>
      </div>
      {/* ─── RIDER ASSIGNMENT MODAL ─── */}
      {assignModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAssignModal(null)} />
          <div className="relative bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col md:flex-row h-[80vh] md:h-[600px]">
            {/* Left: Map */}
            <div className="flex-1 relative bg-slate-100">
              <MapContainer
                center={assignModal.restaurantCoords ? [assignModal.restaurantCoords.lat, assignModal.restaurantCoords.lng] : [20.5937, 78.9629]}
                zoom={14}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />

                {/* Restaurant Marker */}
                {assignModal.restaurantCoords && (
                  <Marker 
                    position={[assignModal.restaurantCoords.lat, assignModal.restaurantCoords.lng]}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div class="bg-white p-2 rounded-2xl shadow-xl border-2 border-orange-500 flex items-center justify-center" style="width:40px; height:40px; transform:translate(-10px, -10px)">
                              <span style="font-size:24px">🏪</span>
                             </div>`,
                      iconSize: [40, 40],
                      iconAnchor: [20, 20]
                    })}
                  />
                )}

                {/* Riders on Map */}
                {onlineRiders.filter(r => r.location).map(rider => (
                  <Marker 
                    key={rider.userId} 
                    position={[rider.location.lat, rider.location.lng]}
                    eventHandlers={{
                      click: () => handleAssignRiderFromModal(rider.userId),
                    }}
                    icon={L.divIcon({
                      className: 'custom-div-icon',
                      html: `<div class="relative group cursor-pointer" style="transform:translate(-20px, -20px)">
                              <div class="absolute -inset-4 bg-orange-500/20 rounded-full animate-ping"></div>
                              <div class="relative bg-white p-2 rounded-xl shadow-lg border border-slate-100 flex items-center justify-center" style="width:36px; height:36px">
                                <span style="font-size:20px">🚚</span>
                              </div>
                            </div>`,
                      iconSize: [36, 36],
                      iconAnchor: [18, 18]
                    })}
                  >
                    <Popup>
                      <div className="font-black text-[10px] uppercase tracking-widest text-slate-900">
                        {rider.name} <br/>
                        {calculateDistance(assignModal.restaurantCoords?.lat, assignModal.restaurantCoords?.lng, rider.location.lat, rider.location.lng)?.toFixed(1)} km away
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg z-[1000] border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                  Assignment Map
                </p>
              </div>
            </div>

            {/* Right: Rider List */}
            <div className="w-full md:w-80 border-l border-slate-100 flex flex-col bg-slate-50">
              <div className="p-6 border-b border-slate-100 bg-white">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-lg text-slate-900">Assign Rider</h3>
                    <button onClick={() => setAssignModal(null)} className="text-slate-400 hover:text-slate-900 transition-colors">
                      <X size={20} />
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  Order #{(assignModal.order?.orderId || assignModal.order?._id)?.slice(-6)} needs a delivery partner
                </p>
                <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                   <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest mb-1">Pickup Store</p>
                   <p className="text-xs font-bold text-slate-900 truncate">{assignModal.order?.restaurantName || 'Restaurant'}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {onlineRiders.length === 0 ? (
                  <div className="text-center py-12">
                    <Wifi size={24} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No riders online</p>
                  </div>
                ) : (
                  onlineRiders.map(rider => {
                    const distance = assignModal.restaurantCoords && rider.location
                      ? calculateDistance(
                          assignModal.restaurantCoords.lat,
                          assignModal.restaurantCoords.lng,
                          rider.location.lat,
                          rider.location.lng
                        )
                      : null;

                    return (
                      <button 
                        key={rider.userId}
                        disabled={assigningTo === rider.userId}
                        onClick={() => handleAssignRiderFromModal(rider.userId)}
                        className="w-full p-4 bg-white rounded-2xl border border-slate-100 hover:border-orange-200 hover:shadow-md transition-all text-left flex items-center gap-4 group disabled:opacity-50"
                      >
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-orange-50 transition-colors">
                           <Truck size={18} className="text-slate-400 group-hover:text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-xs truncate">{rider.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            {rider.vehicleType || 'Bike'} • ★ {rider.rating || '4.5'}
                            {distance !== null && <span className="text-orange-600 ml-2">({distance.toFixed(1)} km)</span>}
                          </p>
                        </div>
                        <ArrowRight size={14} className="text-slate-200 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
