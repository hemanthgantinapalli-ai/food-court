import React from "react";
import { Link } from "react-router-dom";

export default function PaymentSuccess() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-green-50 px-4">
      <div className="rounded-lg bg-white p-8 shadow-lg text-center max-w-md">
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          🎉 Payment Successful!
        </h1>

        <p className="text-gray-700 mb-6">
          Thank you for your order. Your payment has been processed successfully.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            to="/"
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition"
          >
            Go to Home
          </Link>

          <Link
            to="/profile"
            className="rounded border border-green-600 px-4 py-2 text-green-600 hover:bg-green-50 transition"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}