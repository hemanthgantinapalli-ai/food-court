import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

// ---------- Components ----------
import Header from "./components/Header";
import Footer from "./components/Footer";

// ---------- Pages ----------
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import RestaurantDetail from "./pages/RestaurantDetail";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import ProfilePage from "./pages/ProfilePage";
import OffersPage from "./pages/OffersPage";
import TrackOrderPage from "./pages/TrackOrderPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";

// Smooth scroll to top on page change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
};

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="flex min-h-screen flex-col bg-[#F8F9FB] text-slate-900 font-sans antialiased">

        {/* The Header is sticky, so it stays at the top */}
        <Header />

        {/* Main Content: 'grow' pushes footer to bottom. 
           We use 'pt-20' if your header is fixed to avoid overlapping content.
        */}
        <main className="grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/restaurant/:id" element={<RestaurantDetail />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/orders" element={<OrderHistoryPage />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}