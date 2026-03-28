import React, { useState, useEffect } from 'react';
import { Bell, Trash2, CheckCircle, Clock, ArrowLeft, ShoppingBag, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { socket } from '../api/socket';
import Loader from '../components/Loader';

const NOTIFICATION_ICONS = {
  order_update: <ShoppingBag className="text-orange-500" size={20} />,
  info: <Info className="text-blue-500" size={20} />,
  promo: <AlertTriangle className="text-purple-500" size={20} />,
  system: <ShieldCheck className="text-emerald-500" size={20} />,
};

const NOTIFICATION_BG = {
  order_update: 'bg-orange-50',
  info: 'bg-blue-50',
  promo: 'bg-purple-50',
  system: 'bg-emerald-50',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();

    socket.on('new_notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });

    return () => socket.off('new_notification');
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await API.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Clear all notifications?')) return;
    try {
      await API.delete('/notifications/clear');
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-[#F8F9FB] pt-24 pb-12 px-6">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-900 shadow-sm transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Your <span className="text-orange-500">Alerts</span></h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Real-time status updates</p>
            </div>
          </div>
          
          {notifications.length > 0 && (
            <button 
              onClick={clearAll}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-2xl text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm"
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] p-20 text-center border border-slate-100 shadow-sm">
              <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                <Bell size={48} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">All Caught Up!</h2>
              <p className="text-slate-400 font-medium">No new notifications at the moment.</p>
              <Link 
                to="/" 
                className="inline-block mt-8 px-10 py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-100"
              >
                Start Ordering
              </Link>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif._id}
                onClick={() => markAsRead(notif._id)}
                className={`group relative bg-white p-6 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                  notif.isRead ? 'border-transparent opacity-80' : 'border-orange-100 shadow-xl shadow-orange-50/50'
                }`}
              >
                {!notif.isRead && (
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500" />
                )}

                <div className="flex items-start gap-5">
                  <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center ${NOTIFICATION_BG[notif.type] || 'bg-slate-50'}`}>
                    {NOTIFICATION_ICONS[notif.type] || <Bell size={20} className="text-slate-400" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className={`font-black text-lg transition-colors ${notif.isRead ? 'text-slate-500' : 'text-slate-900 group-hover:text-orange-600'}`}>
                        {notif.message}
                      </p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                        className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {notif.type?.replace('_', ' ')}
                      </span>
                    </div>

                    {notif.orderId && (
                      <Link 
                        to={`/order/${notif.orderId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 hover:text-orange-700 transition-colors"
                      >
                        Track Order <CheckCircle size={12} />
                      </Link>
                    )}
                  </div>
                </div>

                {!notif.isRead && (
                  <div className="absolute top-6 right-8">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
