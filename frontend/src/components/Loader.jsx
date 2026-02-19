import React from 'react';
import { Loader } from 'lucide-react';

export default function Loader_Component({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4">
        <div className="spinner" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}
