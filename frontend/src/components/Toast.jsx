import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: 'bg-success',
    error: 'bg-danger',
    info: 'bg-blue-500',
    warning: 'bg-warning',
  }[type] || 'bg-blue-500';

  const Icon = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertCircle,
  }[type] || Info;

  return (
    <div
      className={`fixed bottom-4 right-4 ${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up z-50`}
    >
      <Icon size={20} />
      <p>{message}</p>
    </div>
  );
}
