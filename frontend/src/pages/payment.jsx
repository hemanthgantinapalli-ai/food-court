import React from 'react';
import PaymentSuccess from "./payment"; // Must match the exact filenameimport { useLocation, Link } from 'react-router-dom';

export default function PaymentSuccess() {
  const { search } = useLocation();
  const orderId = new URLSearchParams(search).get('orderId');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow p-8 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-3xl font-bold text-green-600 mb-4">Order Confirmed!</h1>
        <p className="text-gray-700 mb-4">Your meal is on its way.</p>
        {orderId && (
          <p className="text-sm text-gray-500 mb-6 font-mono">Order: {orderId}</p>
        )}
        <Link to="/" className="inline-block bg-[#ff4f00] text-white px-8 py-3 rounded-lg font-bold">Back to Home</Link>
      </div>
    </div>
  );
}