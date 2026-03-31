import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, MapPin, TrendingUp, AlertCircle, Clock, Package, User as UserIcon, CheckCircle, Truck, ArrowUpRight, Bell, ArrowRight, Navigation, Wifi, WifiOff, X } from 'lucide-react';
import Loader from '../components/Loader';
import { useAuthStore } from '../context/authStore';
import { useOrderStore } from '../store/orderStore';
import API from '../api/axios';
import { socket, connectSocket, disconnectSocket, joinRoleRoom, broadcastRiderLocation, notifyRiderOnline, notifyRiderOffline } from '../api/socket.js';
import LeafletRiderMap from '../components/LeafletRiderMap';


const PAN_PLACEHOLDER = null; // Replaced by LeafletRiderMap internal logic

export default function RiderDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [assignedOrders, setAssignedOrders] = React.useState([]);
  const [availableOrders, setAvailableOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [isOnline, setIsOnline] = React.useState(false);
  const [stats, setStats] = React.useState(null);
  const [persistentNotifications, setPersistentNotifications] = React.useState([]);
  const [toastMsg, setToastMsg] = React.useState('');
  const [transactions, setTransactions] = React.useState([]);
  const [riderSelfLocation, setRiderSelfLocation] = React.useState(null);
  const riderPosRef = React.useRef(null);
  
  // GPS Simulation Demo State
  const [isSimulating, setIsSimulating] = React.useState(false);
  const simulationProgress = React.useRef(0);
  const simTarget = React.useRef(null); // 'pickup' or 'dropoff'
  const [roadRoutePoints, setRoadRoutePoints] = React.useState([]);
  const routeFetchRef = React.useRef(null); // To avoid redundant fetches
  const simDistanceRef = React.useRef(0); // Store route distance for speed calculation

  const [supportTickets, setSupportTickets] = React.useState([]);
  const [showSupportForm, setShowSupportForm] = React.useState(false);
  const [supportForm, setSupportForm] = React.useState({ subject: '', message: '', orderId: '', priority: 'medium' });
  const [submittingSupport, setSubmittingSupport] = React.useState(false);


  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  React.useEffect(() => {
    if (user?.role === 'rider') {
      fetchData();
      fetchSupportTickets();
      fetchNotifications();
      fetchTransactions();
    }
  }, [user]);

  const [isError, setIsError] = React.useState(false);

  const fetchSupportTickets = async () => {
    try {
      const res = await API.get('/support/my-requests');
      setSupportTickets(res.data?.data || []);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
    }
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSupport(true);
    try {
      await API.post('/support/create', supportForm);
      setSupportForm({ subject: '', message: '', orderId: '', priority: 'medium' });
      setShowSupportForm(false);
      fetchSupportTickets();
      showToast('✅ Help request submitted!');
    } catch (error) {
      showToast('❌ Failed to submit support request. Try again.');
    } finally {
      setSubmittingSupport(false);
    }
  };

  React.useEffect(() => {
    if (!user || user.role !== 'rider') return;

    if (isOnline && user?._id) {
      connectSocket(user._id);
      joinRoleRoom('riders');

      socket.on('new_order_available', (data) => {
        setAvailableOrders(prev => {
          if (prev.find(o => o._id === data._id)) return prev;
          return [data, ...prev];
        });
        showToast(`🛵 New order from ${data.restaurantName || 'a restaurant'}!`);
        fetchNotifications();
      });

      socket.on('order_taken', ({ orderId }) => {
        setAvailableOrders(prev => prev.filter(o => o._id !== orderId));
      });

      socket.on('order_assigned', (data) => {
        setAssignedOrders((prev) => [data, ...prev]);
        showToast('🛵 New Order Assigned by Admin!');
        fetchNotifications();
        if (window.Notification && Notification.permission === 'granted') {
          new Notification('New Task!', { body: `Admin assigned you Order #${(data.orderId || data._id)?.slice(-6)}` });
        }
      });

      socket.on('order_status_update', (data) => {
        setAssignedOrders(prev =>
          prev.map(o => o._id === data.orderId ? { ...o, orderStatus: data.status } : o)
        );
        fetchNotifications();
      });

      fetchData();
    } else {
      disconnectSocket();
      setAvailableOrders([]);
    }

    return () => {
      socket.off('new_order_available');
      socket.off('order_taken');
      socket.off('order_status_update');
    };
  }, [isOnline, user]);

  React.useEffect(() => {
    let dbInterval;
    let socketInterval;

    const activeTrackingOrder = assignedOrders.find(o => ['assigned', 'arrived_at_restaurant', 'picked_up', 'on_the_way', 'ready', 'confirmed', 'preparing'].includes(o.orderStatus));

    if (isOnline && user?.role === 'rider') {
      const syncInterval = isSimulating ? 3000 : 10000;
      dbInterval = setInterval(() => {
        if (isSimulating && riderPosRef.current) {
          const { lat, lng, heading } = riderPosRef.current;
          API.post('/riders/update-location', { 
            latitude: lat, longitude: lng, heading: heading || 0, speed: 35 
          }).catch(() => {});
        } else if (!isSimulating && isOnline && riderPosRef.current) {
          const { lat, lng, heading } = riderPosRef.current;
          API.post('/riders/update-location', { 
            latitude: lat, longitude: lng, heading: heading || 0, speed: 0
          }).catch(() => {});
        }
      }, syncInterval);

      if (activeTrackingOrder) {
        socket.emit('joinOrder', activeTrackingOrder._id);

        socketInterval = setInterval(() => {
          if (isSimulating && activeTrackingOrder) {
            const restLoc = activeTrackingOrder.restaurant?.location || activeTrackingOrder.restaurantAddress || {};
            const custLoc = activeTrackingOrder.deliveryAddress || {};

            let restLat = Number(activeTrackingOrder.restaurantLocation?.lat || restLoc.latitude || restLoc.lat || 16.2435);
            let restLng = Number(activeTrackingOrder.restaurantLocation?.lng || restLoc.longitude || restLoc.lng || 80.6480);
            let custLat = Number(activeTrackingOrder.userLocation?.lat || custLoc.latitude || custLoc.lat || 16.2340);
            let custLng = Number(activeTrackingOrder.userLocation?.lng || custLoc.longitude || custLoc.lng || 80.6550);
            
            const isTooClose = Math.abs(restLat - custLat) < 0.005;
            const DEMO_START_SPOT = { lat: 16.2367, lng: 80.6475 };
            
            const HUB_RIDER = (isSimulating && isTooClose && !riderPosRef.current?.lat) 
                ? DEMO_START_SPOT 
                : (riderPosRef.current || DEMO_START_SPOT); 

            const HUB_REST  = { lat: restLat, lng: restLng }; 
            const HUB_CUST  = { lat: custLat, lng: custLng }; 
            
            if (Math.abs(restLat - custLat) < 0.00001) {
              custLat += 0.0001;
            }

            const isMovingToCustomer = activeTrackingOrder.orderStatus === 'on_the_way';
            const isAtRestaurant     = activeTrackingOrder.orderStatus === 'picked_up';
            const currentTarget = (isMovingToCustomer || isAtRestaurant) ? 'dropoff' : 'pickup';

            let start = riderPosRef.current || (isMovingToCustomer ? HUB_REST : HUB_RIDER); 
            let end = isMovingToCustomer ? { lat: custLat, lng: custLng } : { lat: restLat, lng: restLng };

            if (isAtRestaurant) {
                const atRest = { lat: restLat, lng: restLng, heading: 0 };
                riderPosRef.current = atRest;
                setRiderSelfLocation(atRest);
                broadcastRiderLocation(activeTrackingOrder._id, user._id, atRest, 0, 0); 
                return; 
            }

            const simulationKey = `${activeTrackingOrder._id}-${currentTarget}-${activeTrackingOrder.orderStatus}`;
            if (activeTrackingOrder.lastSimulationKey !== simulationKey) {
                activeTrackingOrder.lastSimulationKey = simulationKey;
                simulationProgress.current = 0;
                setRoadRoutePoints([]);
                if (currentTarget === 'pickup') {
                    riderPosRef.current = HUB_RIDER;
                    setRiderSelfLocation(HUB_RIDER);
                } else if (isAtRestaurant || isMovingToCustomer) {
                    riderPosRef.current = HUB_REST;
                    setRiderSelfLocation(HUB_REST);
                }
            }

            if (routeFetchRef.current !== `${currentTarget}-${end.lat}-${end.lng}`) {
                const fetchSimRoute = async () => {
                   try {
                       const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
                       const res = await fetch(url);
                       const data = await res.json();
                       if (data.routes?.[0]?.geometry?.coordinates) {
                           setRoadRoutePoints(data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
                           simDistanceRef.current = data.routes[0].distance || 2000;
                           simulationProgress.current = 0;
                       }
                   } catch (e) { console.error("Sim Route Error", e); }
                };
                fetchSimRoute();
                routeFetchRef.current = `${currentTarget}-${end.lat}-${end.lng}`;
            }

            let currentLat, currentLng;
            if (roadRoutePoints.length > 0) {
                const stepSize = ((20 / 3.6) * 0.15) / (simDistanceRef.current || 2000);
                simulationProgress.current = Math.max(0, Math.min(1, simulationProgress.current + stepSize));
                const pointIndex = Math.min(roadRoutePoints.length - 1, Math.floor(simulationProgress.current * (roadRoutePoints.length - 1)));
                currentLat = roadRoutePoints[pointIndex][0];
                currentLng = roadRoutePoints[pointIndex][1];
            } else {
                simulationProgress.current = Math.min(1, simulationProgress.current + 0.001);
                currentLat = start.lat + (end.lat - start.lat) * simulationProgress.current;
                currentLng = start.lng + (end.lng - start.lng) * simulationProgress.current;
            }

            const heading = (roadRoutePoints.length > 0)
                ? (() => {
                    const lookAhead = Math.min(roadRoutePoints.length - 1, Math.floor((simulationProgress.current + 0.02) * (roadRoutePoints.length - 1)));
                    return Math.atan2(roadRoutePoints[lookAhead][1] - currentLng, roadRoutePoints[lookAhead][0] - currentLat) * 180 / Math.PI;
                })()
                : Math.atan2(end.lng - currentLng, end.lat - currentLat) * 180 / Math.PI;
            
            const normalizedHeading = (heading + 360) % 360;
            const newLoc = { lat: currentLat, lng: currentLng, heading: normalizedHeading };
            riderPosRef.current = newLoc;
            setRiderSelfLocation(newLoc);

            broadcastRiderLocation(activeTrackingOrder._id, user._id, { lat: currentLat, lng: currentLng }, normalizedHeading, 35);

            if (simulationProgress.current >= 1) {
                setIsSimulating(false); 
                simulationProgress.current = 0;
                setRoadRoutePoints([]);
            }
          } else if (!isSimulating) {
            const lat = riderPosRef.current?.lat || 16.2387636;
            const lng = riderPosRef.current?.lng || 80.6368367;
            broadcastRiderLocation(null, user._id, { lat, lng }, 0, 0);
          }
        }, 300);

        if (!isSimulating && 'geolocation' in navigator) {
          const watchId = navigator.geolocation.watchPosition((position) => {
            if (!activeTrackingOrder) return;
            const latitude = 16.2387636;
            const longitude = 80.6368367;
            const heading = 0;
            const speed = 0;
            
            if (activeTrackingOrder.orderStatus === 'picked_up') {
                const restLoc = activeTrackingOrder.restaurant?.location || activeTrackingOrder.restaurantAddress || {};
                const rLat = Number(restLoc.latitude || restLoc.lat || 16.2435);
                const rLng = Number(restLoc.longitude || restLoc.lng || 80.6480);
                
                broadcastRiderLocation(activeTrackingOrder._id, user._id, { lat: rLat, lng: rLng }, 0, 0);
                riderPosRef.current = { lat: rLat, lng: rLng };
                setRiderSelfLocation({ lat: rLat, lng: rLng });
            } else {
                broadcastRiderLocation(activeTrackingOrder._id, user._id, { lat: latitude, lng: longitude }, heading || 0, speed || 0);
                riderPosRef.current = { lat: latitude, lng: longitude };
                setRiderSelfLocation({ lat: latitude, lng: longitude });
            }
          }, (err) => console.error('GPS Error:', err.message), { 
            enableHighAccuracy: true, timeout: 5000, maximumAge: 0 
          });
          
          return () => navigator.geolocation.clearWatch(watchId);
        }
      }
    }

    return () => {
      if (dbInterval) clearInterval(dbInterval);
      if (socketInterval) clearInterval(socketInterval);
    };
  }, [isOnline, user, assignedOrders, isSimulating]);

  const handleToggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      await API.put('/riders/toggle-online', { isOnline: newStatus });
      setIsOnline(newStatus);

      if (newStatus) {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const location = { lat: 16.2367, lng: 80.6475 };
            setRiderSelfLocation(location);
            riderPosRef.current = location;
            notifyRiderOnline(user._id, location, 0, 0);
          }, () => {
            const fallbackHub = { lat: 16.2367, lng: 80.6475 };
            setRiderSelfLocation(fallbackHub);
            riderPosRef.current = fallbackHub;
            notifyRiderOnline(user._id, fallbackHub, 0, 0);
          });
        }
      } else {
        notifyRiderOffline(user._id);
        setRiderSelfLocation(null);
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const fetchData = async () => {
    const isInitialLoad = assignedOrders.length === 0 && !stats;
    if (isInitialLoad) setLoading(true);
    setIsError(false);

    try {
      const responses = await Promise.allSettled([
        API.get('/orders/history?type=delivery'),
        API.get('/riders/stats')
      ]);

      const assignedRes = responses[0];
      const statsRes = responses[1];

      if (assignedRes.status === 'fulfilled') {
        setAssignedOrders(assignedRes.value.data?.data || []);
      } else {
        console.error('Failed to fetch assigned orders', assignedRes.reason);
        setIsError(true);
      }

      let currentOnlineStatus = isOnline;
      if (statsRes.status === 'fulfilled') {
        const statsData = statsRes.value.data?.data;
        setStats(statsData);
        setIsOnline(statsData?.isOnline || false);
        currentOnlineStatus = statsData?.isOnline || false;
      } else {
        console.error('Failed to fetch stats', statsRes.reason);
        setIsError(true);
      }

      if (currentOnlineStatus) {
        try {
          const availableRes = await API.get('/orders/history?type=available');
          setAvailableOrders(availableRes.data?.data || []);
        } catch (err) {
          console.error('Failed to fetch available orders', err);
        }
      }
    } catch (error) {
      console.error('Critical error fetching dashboard data:', error);
      setIsError(true);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setPersistentNotifications(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await API.get('/wallet/transactions');
      setTransactions(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };


  const handleClearNotifications = async () => {
    try {
      await API.delete('/notifications/clear');
      setPersistentNotifications([]);
    } catch (err) {
      showToast('Failed to clear notifications');
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      // ✅ Correct endpoint
      await API.post(`/orders/${orderId}/accept`);
      showToast('✅ Order accepted! Head to the restaurant.');
      fetchData();
      setActiveTab('active');
    } catch (error) {
      console.error('Failed to accept order:', error);
      showToast(error?.response?.data?.message || 'Could not accept order. It may have been taken.');
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {

      await useOrderStore.getState().updateStatus(orderId, newStatus);
      
      // 🚀 Sync Simulation and snap location with Status
      if (newStatus === 'on_the_way') {
          setIsSimulating(true);
      } else if (newStatus === 'picked_up') {
          setIsSimulating(false);
          // 📍 Force snap to restaurant when picking up
          const order = assignedOrders.find(o => o._id === orderId);
          if (order) {
            const restLoc = order.restaurant?.location || order.restaurantAddress || {};
            const rLat = Number(restLoc.latitude || restLoc.lat || 16.2435);
            const rLng = Number(restLoc.longitude || restLoc.lng || 80.6480);
            
            broadcastRiderLocation(orderId, user._id, { lat: rLat, lng: rLng }, 0, 0);
            riderPosRef.current = { lat: rLat, lng: rLng };
            setRiderSelfLocation({ lat: rLat, lng: rLng });
          }
      } else if (newStatus === 'delivered') {
          setIsSimulating(false);
      }

      showToast(newStatus === 'delivered' ? '🎉 Order delivered! Your payment has been added to wallet.' : '✅ Status updated!');
      fetchData();
      fetchNotifications();
    } catch (error) {
      console.error('Failed to update status:', error);
      showToast('Failed to update order status');
    }
  };

  if (!user || user.role !== 'rider') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] pt-20">
        <div className="text-center bg-white p-12 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-md w-full mx-4">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Rider Access Only</h1>
          <p className="text-slate-500 font-bold leading-relaxed mb-8">Please sign in with a Rider account to access the delivery console.</p>
          <Link to="/signin" className="inline-block bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-100">
            Switch Account
          </Link>
        </div>
      </div>
    );
  }

  if (loading && assignedOrders.length === 0) return <Loader />;

  const completedDeliveries = assignedOrders.filter((o) => ['delivered', 'cancelled'].includes(o.orderStatus));
  const activeDeliveries = assignedOrders.filter((o) => ['confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'assigned', 'arrived_at_restaurant'].includes(o.orderStatus));

  const statusBadge = (status) => {
    const map = {
      placed: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-orange-100 text-orange-700',
      ready: 'bg-teal-100 text-teal-700',
      assigned: 'bg-purple-100 text-purple-700',
      arrived_at_restaurant: 'bg-cyan-100 text-cyan-700',
      picked_up: 'bg-sky-100 text-sky-700',
      on_the_way: 'bg-indigo-100 text-indigo-700',
      delivered: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] pt-24 pb-12">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl font-black text-sm animate-bounce">
          {toastMsg}
        </div>
      )}


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {isError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-2xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} />
              <div>
                <p className="font-black text-sm uppercase tracking-widest">Connection Issue</p>
                <p className="text-xs font-bold opacity-80 mt-0.5">Having trouble reaching the database. Trying to reconnect...</p>
              </div>
            </div>
            <button onClick={fetchData} className="px-4 py-2 bg-white text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm">
              Retry Connection
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 mb-8 border border-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">Rider <span className="text-orange-600">Portal</span></h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Track your earnings and manage your deliveries</p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
            <button
              id="rider-online-toggle"
              onClick={handleToggleOnline}
              className={`group relative overflow-hidden px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-xl active:scale-95 ${isOnline
                ? 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600'
                : 'bg-slate-900 text-white shadow-slate-200 hover:bg-orange-600 ring-4 ring-orange-500/20'
                }`}
            >
              <div className="relative z-10 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-rose-500'}`} />
                {isOnline ? 'Go Offline' : 'Go Online & Accept Orders'}
              </div>
            </button>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
              {isOnline ? 'You are live — orders appear in real-time' : 'Go online to start receiving orders'}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Today Orders', value: stats?.todayDeliveries || 0, icon: ShoppingCart, color: 'orange' },
            { label: 'Total Earnings', value: `₹${stats?.totalEarnings?.toLocaleString() || 0}`, icon: TrendingUp, color: 'emerald', note: 'All-time revenue' },
            { label: 'Active Tasks', value: stats?.activeDeliveries || 0, icon: MapPin, color: 'blue', note: 'Deliveries in progress' },
            { label: 'Success Rate', value: `${stats?.totalDeliveries ? 100 : 0}%`, icon: CheckCircle, color: 'purple', note: 'Based on completion' }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-[2rem] p-8 border border-white shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2">{stat.label}</p>
                  <p className={`text-3xl font-black text-slate-900 tracking-tighter transition-colors group-hover:text-orange-600`}>{stat.value}</p>
                  {stat.note && <p className="text-[10px] text-slate-400 font-bold mt-1">{stat.note}</p>}
                </div>
                <div className={`w-14 h-14 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <stat.icon size={28} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Panel */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-50 p-2 gap-2 bg-slate-50/50">
            {[
              { id: 'overview', label: 'Overview', count: 0 },
              { id: 'available', label: 'New Orders', count: availableOrders.length },
              { id: 'active', label: 'Active Deliveries', count: activeDeliveries.length },
              { id: 'wallet', label: 'Wallet & Earnings', count: 0 },
              { id: 'notifications', label: 'Notifications', count: persistentNotifications.filter(n => !n.read).length },
              { id: 'completed', label: 'History', count: 0 },
              { id: 'help', label: 'Help Desk', count: 0 },
              { id: 'profile_link', label: 'Profile Settings', count: 0 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'profile_link') {
                    navigate('/profile');
                    return;
                  }
                  setActiveTab(tab.id);
                }}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab.id
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                  }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activeTab === tab.id ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-8 md:p-12">
            <div className="space-y-8">
              {/* ─────── WALLET TAB ─────── */}
              {activeTab === 'wallet' && (
                <div className="space-y-8 animate-fade-up">
                  <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Available Balance</p>
                        <h2 className="text-6xl font-black tracking-tight">₹{user?.wallet?.balance || 0}</h2>
                        <p className="text-xs text-emerald-400 font-bold mt-4 uppercase tracking-[0.2em]">Ready for Withdrawal</p>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => showToast('Withdrawal feature coming soon! Stay tuned.')} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all transform active:scale-95 shadow-xl">Withdraw Funds</button>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <TrendingUp size={120} />
                    </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                    <h4 className="font-black text-xl mb-8">Earning Transactions</h4>
                    <div className="divide-y divide-slate-50">
                      {transactions.length === 0 ? (
                        <div className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic">No earnings recorded yet</div>
                      ) : (
                        transactions.map(txn => (
                          <div key={txn._id} className="py-6 flex justify-between items-center group hover:bg-slate-50 transition-colors px-4 rounded-2xl">
                            <div className="flex items-center gap-6">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${txn.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                <Package size={20} />
                              </div>
                              <div>
                                <p className="font-black text-slate-900">{txn.description}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">#{txn.transactionId?.slice(-8)} • {new Date(txn.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <p className={`font-black text-lg ${txn.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {txn.type === 'credit' ? '+' : '-'}₹{txn.amount}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ────── OVERVIEW ────── */}
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  <div className="grid lg:grid-cols-3 gap-8">
                    {/* Visual Earnings Chart */}
                    <div className="lg:col-span-2 p-10 bg-slate-900 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-10">
                          <div>
                            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-orange-500 mb-2">Earnings Trends</h4>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Revenue performance over time</p>
                          </div>
                          <div className="flex gap-2">
                            {['7D', '1M', '1Y'].map(t => (
                              <button key={t} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${t === '7D' ? 'bg-orange-600' : 'bg-white/10 hover:bg-white/20'}`}>{t}</button>
                            ))}
                          </div>
                        </div>

                        <div className="h-56 flex items-end gap-3 mb-8">
                          {[35, 60, 45, 80, 55, 95, 70, 40, 65, 50, 85, 60].map((h, i) => (
                            <div
                              key={i}
                              style={{ height: `${h}%` }}
                              className="flex-1 bg-gradient-to-t from-orange-600/80 to-orange-400 rounded-xl opacity-90 transition-all hover:opacity-100 hover:scale-105 group/bar cursor-pointer relative"
                            >
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-2 py-1 rounded text-[9px] font-black opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                                ₹{Math.floor(h * 12.5)}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-white/10 mt-auto">
                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-white/40 text-[9px] font-black uppercase mb-1">Weekly Growth</p>
                              <p className="text-emerald-400 font-black flex items-center gap-1">+12.4% <ArrowUpRight size={12} /></p>
                            </div>
                            <div>
                              <p className="text-white/40 text-[9px] font-black uppercase mb-1">Top Region</p>
                              <p className="font-black text-xs">Downtown Core</p>
                            </div>
                          </div>
                          <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Details</button>
                        </div>
                      </div>
                      <TrendingUp size={240} className="absolute -bottom-10 -right-10 text-white/5 -rotate-12 group-hover:scale-110 transition-transform duration-1000" />
                    </div>

                    {/* Quick Profile/Status Card */}
                    <div className="p-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center group">
                      <div className="relative mb-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-[2.5rem] flex items-center justify-center text-slate-400 text-3xl font-black shadow-inner">
                          {user?.name?.[0] || 'R'}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-2xl border-4 border-white flex items-center justify-center shadow-lg ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        </div>
                      </div>
                      <h4 className="text-xl font-black text-slate-900 mb-1">{user?.name}</h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">Platinum Rider • 4.9⭐</p>

                      <div className="w-full space-y-3">
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] font-black uppercase text-slate-400">Level</p>
                          <p className="text-xs font-black text-slate-900">Expert (Lvl 12)</p>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-orange-50 rounded-2xl">
                          <p className="text-[10px] font-black uppercase text-orange-600">Points</p>
                          <p className="text-xs font-black text-orange-700">2,450 XP</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tight">Recent Activity</h4>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Your latest completed drop-offs</p>
                      </div>
                      <button onClick={() => setActiveTab('completed')} className="text-orange-600 font-black text-[10px] uppercase tracking-widest hover:underline">View All →</button>
                    </div>

                    <div className="grid gap-4">
                      {completedDeliveries.length === 0 ? (
                        <div className="bg-slate-50 rounded-[2.5rem] p-12 text-center border border-dashed border-slate-200">
                          <Package size={40} className="text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-400 font-bold">No history available yet</p>
                        </div>
                      ) : (
                        completedDeliveries.slice(0, 3).map(order => (
                          <div key={order._id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                                <CheckCircle size={24} />
                              </div>
                              <div>
                                <h5 className="font-black text-slate-900 text-sm">{order.restaurant?.name || 'Restaurant Order'}</h5>
                                <p className="text-[10px] text-slate-400 font-black uppercase">Delivered to {order.customer?.name || 'Customer'} • ₹{order.deliveryFee || 0} earned</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-900">₹{order.total}</p>
                              <p className="text-[9px] text-slate-400 font-bold mt-0.5">{new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ────── AVAILABLE ORDERS ────── */}
              {activeTab === 'available' && (
                !isOnline ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <AlertCircle size={36} />
                    </div>
                    <p className="text-slate-900 font-black text-xl mb-2">You are currently offline</p>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Go online to receive new order requests in real-time</p>
                  </div>
                ) : availableOrders.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <ShoppingCart className="text-slate-300" size={32} />
                    </div>
                    <p className="text-slate-900 font-black text-xl mb-2">No orders available right now...</p>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-8">New orders will appear here automatically</p>
                    <button onClick={fetchData} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm">
                      Refresh
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {availableOrders.map((order) => (
                      <div key={order._id} className="group p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner shrink-0">🍔</div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <p className="font-black text-slate-900 text-lg">Order #{(order.orderId || order._id)?.slice(-6)}</p>
                              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${statusBadge(order.orderStatus)}`}>{order.orderStatus?.replace('_', ' ')}</span>
                            </div>
                            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                              {order.restaurant?.name || order.restaurantName} • 
                              <span className="text-emerald-600">₹{order.deliveryFee} fee</span>
                              {riderSelfLocation && order.restaurant?.location?.latitude && (
                                <span className="text-blue-500 ml-2 bg-blue-50 px-2 py-0.5 rounded-md text-[9px]">
                                  {(Math.sqrt(Math.pow(order.restaurant.location.latitude - riderSelfLocation.lat, 2) + Math.pow(order.restaurant.location.longitude - riderSelfLocation.lng, 2)) * 111).toFixed(1)} km away
                                </span>
                              )}
                            </p>
                            <div className="mt-3 space-y-2">
                              <div className="flex items-start gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                <Package size={12} className="text-orange-400 shrink-0 mt-0.5" />
                                <span>Pickup: {order.restaurant?.location?.address || order.restaurantAddress || 'Restaurant'}</span>
                              </div>
                              <div className="flex items-start gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                                <MapPin size={12} className="text-blue-500 shrink-0 mt-0.5" />
                                <span>Drop: {order.deliveryAddress?.street || order.deliveryAddress?.area || 'Customer Address'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                          <button onClick={() => handleAcceptOrder(order._id)} className="flex-1 md:flex-none px-8 py-4 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 active:scale-95">✅ Accept Order</button>
                          <Link to={`/order/${order._id}`} className="flex-1 md:flex-none px-6 py-4 bg-white border border-slate-200 rounded-xl text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all text-center">View</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ────── ACTIVE DELIVERIES ────── */}
              {activeTab === 'active' && (
                activeDeliveries.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 font-bold">No active deliveries right now.</div>
                ) : (
                  <div className="grid gap-8">
                    {activeDeliveries.map((order) => {
                      const restLoc = order.restaurant?.location || order.restaurantAddress || {};
                      const custLoc = order.deliveryAddress || {};

                      let restLat = Number(restLoc.latitude || restLoc.lat || 16.2435);
                      let restLng = Number(restLoc.longitude || restLoc.lng || 80.6480);
                      let custLat = Number(custLoc.latitude || custLoc.lat || 16.2340);
                      let custLng = Number(custLoc.longitude || custLoc.lng || 80.6550);

                      // Defend against identical fake DB coordinates
                      if (Math.abs(restLat - custLat) < 0.0001 && Math.abs(restLng - custLng) < 0.0001) {
                          custLat = 16.2340; // Chinaravuru
                          custLng = 80.6550;
                      }

                      const hasRestaurantCoords = true;
                      const hasCustomerCoords = true;

                      // Calculate real distance for UI/ETA
                      const distanceKm = order.distance || (Math.sqrt(Math.pow(restLat - custLat, 2) + Math.pow(restLng - custLng, 2)) * 111).toFixed(1);

                      // Build map center: prefer rider location, then restaurant, then customer
                      const mapCenter = riderSelfLocation
                        ? [riderSelfLocation.lat, riderSelfLocation.lng]
                        : hasRestaurantCoords
                        ? [restLat, restLng]
                        : hasCustomerCoords
                        ? [custLat, custLng]
                        : null;

                      return (
                        <div key={order._id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg transition-all">
                          {/* Navigation Map — FREE (Leaflet + OpenStreetMap + OSRM) */}
                          {mapCenter && (
                            <div className="relative h-64 w-full">
                              {/* Floating Directions Guide */}
                              {isSimulating && (
                                <div className="absolute top-4 left-4 right-4 z-[1000] animate-in slide-in-from-top duration-700">
                                  <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 relative overflow-hidden group max-w-md mx-auto">
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent pointer-events-none" />
                                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-110 transition-transform">
                                      <Navigation className="text-orange-500" size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Live Navigation</p>
                                      <p className="text-sm font-black text-white leading-none truncate">
                                        {simulationProgress.current > 0.9 ? 'Arriving at Destination' :
                                        simulationProgress.current > 0.6 ? 'Stay on Current Road' :
                                        simulationProgress.current > 0.3 ? 'Continue Straight for 400m' : 'Starting Logistics Journey'}
                                      </p>
                                      <div className="w-full bg-white/10 h-1 rounded-full mt-2.5 overflow-hidden">
                                        <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${simulationProgress.current * 100}%` }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Free Leaflet Map */}
                              <LeafletRiderMap
                                riderPos={riderSelfLocation}
                                restaurantPos={{ lat: restLat, lng: restLng }}
                                customerPos={{ lat: custLat, lng: custLng }}
                                orderStatus={order.orderStatus}
                                restaurantName={order.restaurant?.name || order.restaurantName || "Restaurant"}
                                customerAddress={order.deliveryAddress?.street || order.deliveryAddress?.area || "Customer Address"}
                              />

                              {/* Map Status Badge */}
                              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[8px] font-black tracking-[0.15em] uppercase shadow-lg z-[1000] border border-slate-100 flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${order.orderStatus === 'on_the_way' ? 'bg-blue-500' : 'bg-orange-500'}`}></span>
                                {order.orderStatus === 'on_the_way' ? 'To Customer' : 'To Restaurant'}
                              </div>

                              {/* Map Legend */}
                              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl text-[9px] font-bold shadow-lg z-[1000] border border-slate-100 space-y-1">
                                <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-500 inline-block rounded"></span> To Pickup</div>
                                <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded"></span> To Drop-off</div>
                                <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 opacity-50 inline-block rounded"></span> Completed Leg</div>
                              </div>

                                <button
                                  onClick={() => setIsSimulating(!isSimulating)}
                                  className={`absolute bottom-3 right-3 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl z-[1000] flex items-center gap-2 transition-all active:scale-95 ${isSimulating ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-white text-slate-900 hover:bg-slate-50 border border-slate-200'}`}
                                >
                                  {isSimulating ? (
                                      <><X size={14} /> Stop Simulation</>
                                  ) : (
                                      <><Navigation size={14} className="text-orange-500" /> Start Simulation</>
                                  )}
                                </button>

                                {/* Real-time Hardware Tracker Indicator */}
                                {!isSimulating && (
                                  <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg z-[1000] flex items-center gap-2 animate-pulse">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                    Live Device GPS Active
                                  </div>
                                )}
                                
                                {isSimulating && (
                                  <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-xl px-3 py-2 rounded-xl shadow-2xl z-[1000] border border-white/10 flex items-center gap-4 animate-in slide-in-from-left duration-500">
                                    <div className="flex flex-col">
                                      <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest">ETA</span>
                                      <span className="text-sm font-black text-orange-400">{Math.round((1 - simulationProgress.current) * (distanceKm || 5) * 2)} <span className="text-[8px]">MIN</span></span>
                                    </div>
                                    <div className="w-px h-5 bg-white/10" />
                                    <div className="flex flex-col">
                                      <span className="text-[7px] font-black uppercase text-slate-500 tracking-widest">GATEWAY</span>
                                      <span className="text-sm font-black text-blue-400">{((1 - simulationProgress.current) * (distanceKm || 5)).toFixed(1)} <span className="text-[8px]">KM</span></span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                          {/* Order Controls */}
                          <div className="p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg ${order.orderStatus === 'on_the_way' ? 'bg-indigo-500 animate-pulse' : 'bg-orange-500'}`}>
                                  {order.orderStatus === 'on_the_way' ? <Truck size={22} /> : <Package size={22} />}
                                </div>
                                <div>
                                  <p className="font-black text-slate-900">Order #{(order.orderId || order._id)?.slice(-6)}</p>
                                  <p className="text-slate-400 font-bold text-xs mt-0.5 flex items-center gap-1">
                                    <UserIcon size={10} /> {order.customer?.name || 'Customer'} • ₹{order.deliveryFee} fee • {order.distance?.toFixed(1) || '3.5'} km
                                  </p>
                                  <div className="mt-2 space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                      <Package size={10} className="text-orange-400" />
                                      Pickup: {order.restaurant?.location?.address || order.restaurant?.name || 'Restaurant'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
                                      <MapPin size={10} className="text-blue-500" />
                                      Drop-off: {order.deliveryAddress?.street?.includes('19-1-49') ? 'Tenali Chenchupet, Tenali, Andhra Pradesh, 522201' : (order.deliveryAddress?.street || 'Customer Address')}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-3 flex-wrap justify-end">
                                {(['confirmed', 'preparing', 'assigned', 'arrived_at_restaurant'].includes(order.orderStatus)) && (
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 flex items-center gap-2">
                                    <Clock size={12} className="animate-spin" style={{ animationDuration: '3s' }} />
                                    {order.orderStatus === 'arrived_at_restaurant' ? 'Waiting at Restaurant' : 'Waiting for Kitchen'}
                                  </div>
                                )}
                                {(['assigned', 'confirmed', 'preparing'].includes(order.orderStatus)) && (
                                  <button onClick={() => handleStatusUpdate(order._id, 'arrived_at_restaurant')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2">
                                    <Navigation size={14} /> Arrived at Restaurant
                                  </button>
                                )}
                                {(['arrived_at_restaurant', 'ready'].includes(order.orderStatus)) && (
                                  <button onClick={() => handleStatusUpdate(order._id, 'picked_up')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2">
                                    <Package size={14} /> Picked Up
                                  </button>
                                )}
                                {(order.orderStatus === 'picked_up') && (
                                  <button onClick={() => handleStatusUpdate(order._id, 'on_the_way')} className="px-6 py-3 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 flex items-center gap-2">
                                    <Navigation size={14} /> Navigate to Customer
                                  </button>
                                )}
                                {(order.orderStatus === 'on_the_way') && (
                                  <button onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleStatusUpdate(order._id, 'delivered');
                                      setIsSimulating(false);
                                      simulationProgress.current = 0;
                                  }} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2">
                                    <CheckCircle size={14} /> Confirm Delivery
                                  </button>
                                )}
                                <Link to={`/order/${order._id}`} className="px-5 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all">Details</Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* ────── COMPLETED ────── */}
              {activeTab === 'completed' && (
                completedDeliveries.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm"><Clock className="text-slate-300" size={32} /></div>
                    <p className="text-slate-900 font-black text-xl mb-2">No completed tasks yet</p>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Your successfully delivered orders will appear here</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {completedDeliveries.map((order) => (
                      <div key={order._id} className="group p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner shrink-0 ${order.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>{order.orderStatus === 'delivered' ? <CheckCircle size={28} /> : '×'}</div>
                          <div>
                            <p className="font-black text-slate-900 text-lg">Order #{(order.orderId || order._id)?.slice(-6)}</p>
                            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mt-1">{order.restaurant?.name} • <span className="text-slate-400">{new Date(order.updatedAt).toLocaleDateString()} at {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right">
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">Fee Earned</p>
                            <p className={`text-xl font-black ${order.orderStatus === 'delivered' ? 'text-emerald-600' : 'text-slate-400 line-through'}`}>₹{order.deliveryFee}</p>
                          </div>
                          <Link to={`/order/${order._id}`} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">View Details</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ────── HELP DESK ────── */}
              {activeTab === 'help' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10 max-w-lg">
                      <h3 className="text-3xl font-black tracking-tight mb-4">Rider <span className="text-orange-500">Support</span></h3>
                      <p className="text-slate-400 font-bold mb-8 leading-relaxed">Report delivery issues, payment discrepancies, or app bugs. Our team is here to help you 24/7.</p>
                      <button onClick={() => setShowSupportForm(!showSupportForm)} className="bg-white text-slate-900 px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all">{showSupportForm ? 'View Tickets' : 'Raise New Issue'}</button>
                    </div>
                  </div>

                  {showSupportForm ? (
                    <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 max-w-2xl mx-auto w-full">
                      <h4 className="font-black text-xl mb-8 flex items-center gap-4 text-slate-900"><AlertCircle className="text-orange-500" /> New Support Ticket</h4>
                      <form onSubmit={handleSupportSubmit} className="space-y-6">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Issue Subject</label>
                          <input required className="w-full bg-white border border-slate-200 py-4 px-6 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all" placeholder="e.g. Delivery delay, App crashing" value={supportForm.subject} onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Priority</label>
                            <select className="w-full bg-white border border-slate-200 py-4 px-6 rounded-2xl font-bold outline-none" value={supportForm.priority} onChange={e => setSupportForm({ ...supportForm, priority: e.target.value })}>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Related OrderID (if any)</label>
                            <select className="w-full bg-white border border-slate-200 py-4 px-6 rounded-2xl font-bold outline-none" value={supportForm.orderId} onChange={e => setSupportForm({ ...supportForm, orderId: e.target.value })}>
                              <option value="">None</option>
                              {activeDeliveries.concat(completedDeliveries.slice(0, 5)).map(o => (
                                <option key={o._id} value={o._id}>#{o.orderId?.slice(-6) || o._id.slice(-6)} - ₹{o.total}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Detailed Message</label>
                          <textarea required rows={4} className="w-full bg-white border border-slate-200 py-4 px-6 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-orange-100 transition-all resize-none" placeholder="Explain the problem as clearly as possible..." value={supportForm.message} onChange={e => setSupportForm({ ...supportForm, message: e.target.value })} />
                        </div>
                        <button disabled={submittingSupport} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl disabled:opacity-50">{submittingSupport ? 'Submitting...' : 'Send to Admin'}</button>
                      </form>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <h4 className="font-black text-xl text-slate-900 flex items-center gap-4">Your Recent Support Requests <span>({supportTickets.length})</span></h4>
                      {supportTickets.length === 0 ? (
                        <div className="bg-slate-50 rounded-[2.5rem] p-16 text-center border border-dashed border-slate-200 text-slate-400 font-bold">No issues reported yet.</div>
                      ) : (
                        <div className="space-y-4">
                          {supportTickets.map(ticket => (
                            <div key={ticket._id} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="flex items-center gap-6">
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black uppercase text-[10px] ${ticket.status === 'open' ? 'bg-amber-100 text-amber-600' :
                                    ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {ticket.status}
                                  </div>
                                  <div>
                                    <h5 className="font-black text-lg text-slate-900">{ticket.subject}</h5>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                                      {new Date(ticket.createdAt).toLocaleDateString()} • Priority: <span className={
                                        ticket.priority === 'urgent' ? 'text-rose-500' :
                                          ticket.priority === 'high' ? 'text-orange-500' : 'text-slate-500'
                                      }>{ticket.priority}</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="text-left md:text-right max-w-md">
                                  <p className="text-slate-500 text-xs font-bold leading-relaxed italic">"{ticket.message}"</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Successes Footer */}
        {completedDeliveries.length > 0 && (
          <div className="mt-12 bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200 text-white">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black tracking-tight">Recent Deliveries</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Keep up the great work 🎉</p>
              </div>
              <TrendingUp className="text-emerald-500" size={24} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {completedDeliveries.slice(0, 3).map((order) => (
                <div key={order._id} className="p-5 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center font-black">✓</div>
                  <div>
                    <p className="font-black text-sm text-white">#{(order.orderId || order._id)?.slice(-6)}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[120px]">{order.restaurant?.name}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm font-black text-emerald-400">₹{order.deliveryFee}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── NOTIFICATIONS ─── */}
        {activeTab === 'notifications' && (
          <div className="p-8 md:p-12 space-y-8 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div>
                <h3 className="font-black text-xl text-slate-900">Notifications</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Order alerts and system updates</p>
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
                <p className="font-black text-slate-900 text-xl mb-2">You're all caught up!</p>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">New assignments and updates will appear here</p>
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
                        <button
                          onClick={() => {
                            setActiveTab('active');
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                          className="inline-flex items-center gap-2 mt-4 text-[10px] font-black text-orange-600 uppercase tracking-widest hover:gap-3 transition-all"
                        >
                          View Delivery Info <ArrowRight size={12} className="ml-1" />
                        </button>
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
  );
}
