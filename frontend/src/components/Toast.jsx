import React from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: { bg: 'bg-emerald-50', text: 'text-emerald-900', icon: CheckCircle, border: 'border-emerald-100', accent: 'bg-emerald-500' },
    error: { bg: 'bg-rose-50', text: 'text-rose-900', icon: XCircle, border: 'border-rose-100', accent: 'bg-rose-500' },
    info: { bg: 'bg-slate-900', text: 'text-white', icon: Info, border: 'border-slate-800', accent: 'bg-orange-500' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-900', icon: AlertTriangle, border: 'border-amber-100', accent: 'bg-amber-500' },
  }[type] || styles.info;

  const Icon = styles.icon;

  return (
    <div className={`fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-10 fade-in duration-500`}>
      <div className={`flex items-center gap-5 p-5 pr-8 rounded-[2rem] shadow-2xl ${styles.bg} ${styles.text} border ${styles.border} backdrop-blur-xl`}>
        <div className={`p-3 rounded-2xl ${styles.accent} text-white shadow-lg`}>
          <Icon size={20} strokeWidth={3} />
        </div>
        <div>
          <p className="text-sm font-black tracking-tight">{message}</p>
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">Just now</p>
        </div>
      </div>
    </div>
  );
}