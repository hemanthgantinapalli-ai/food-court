import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

// ---------- Layout ----------
import Header from "./components/Header";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import QuickRoleSwitcher from "./components/QuickRoleSwitcher";
import { useAuthStore } from "./context/authStore";

// ---------- Customer Pages ----------
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
import OrderDetailPage from "./pages/OrderDetailPage";
import CustomerDashboard from "./pages/CustomerDashboard";
import ForgotPassword from "./pages/ForgotPassword";

// ---------- Role Dashboards (no shared Header/Footer) ----------
import AdminDashboard from "./pages/AdminDashboard";
import AdminMenu from "./pages/AdminMenu";
import AdminSignIn from "./pages/AdminSignIn";
import AdminSignUp from "./pages/AdminSignUp";
import RiderDashboard from "./pages/RiderDashboard";
import RiderSignIn from "./pages/RiderSignIn";
import RestaurantSignIn from "./pages/RestaurantSignIn";
import RestaurantSignUp from "./pages/RestaurantSignUp";
import PartnerDashboard from "./pages/PartnerDashboard";

// ─── Scroll To Top ────────────────────────────────────────────────
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
};

// ─── Paths that should NOT show the consumer Header/Footer ────────
const DASHBOARD_PATHS = ["/admin", "/admin/menu", "/admin/login", "/admin/signup", "/rider", "/rider/login", "/partner", "/restaurant/login", "/restaurant/signup"];

// ─── Inner App (inside Router context) ───────────────────────────
function AppInner() {
  const { pathname } = useLocation();
  const { token, getProfile } = useAuthStore();

  useEffect(() => {
    if (token) {
      getProfile();
    }
  }, [token, getProfile]);

  const isDashboard = DASHBOARD_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  return (
    <>
      <ScrollToTop />
      <div className="flex min-h-screen flex-col bg-[#F8F9FB] text-slate-900 font-sans antialiased">

        {/* Consumer Header — hidden on all dashboard routes */}
        {!isDashboard && <Header />}

        <main className="grow">
          <Routes>

            {/* ── Public Routes ─────────────────────────────── */}
            <Route path="/" element={<Home />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Role-Specific Login Pages */}
            <Route path="/admin/login" element={<AdminSignIn />} />
            <Route path="/admin/signup" element={<AdminSignUp />} />
            <Route path="/rider/login" element={<RiderSignIn />} />
            <Route path="/restaurant/login" element={<RestaurantSignIn />} />
            <Route path="/restaurant/signup" element={<RestaurantSignUp />} />

            <Route path="/restaurant/:id" element={<RestaurantDetail />} />
            <Route path="/offers" element={<OffersPage />} />
            {/* Cart is public — guest can browse; login is only required at checkout */}
            <Route path="/cart" element={<CartPage />} />
            {/* Track order is public — shareable links work without login */}
            <Route path="/track-order" element={<TrackOrderPage />} />

            {/* ── Customer-Only Routes ──────────────────────── */}
            <Route
              path="/checkout"
              element={
                <ProtectedRoute allowedRoles={[]}>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-success"
              element={
                <ProtectedRoute allowedRoles={[]}>
                  <PaymentSuccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={[]}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={[]}>
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute allowedRoles={[]}>
                  <OrderHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order/:orderId"
              element={
                <ProtectedRoute allowedRoles={[]}>
                  <OrderDetailPage />
                </ProtectedRoute>
              }
            />

            {/* ── Admin Dashboard (no consumer Header/Footer) ── */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/menu"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminMenu />
                </ProtectedRoute>
              }
            />

            {/* ── Rider Dashboard (no consumer Header/Footer) ── */}
            <Route
              path="/rider"
              element={
                <ProtectedRoute allowedRoles={["rider"]}>
                  <RiderDashboard />
                </ProtectedRoute>
              }
            />
            {/* ── Restaurant Partner Dashboard (no consumer Header/Footer) ── */}
            <Route
              path="/partner"
              element={
                <ProtectedRoute allowedRoles={["restaurant"]}>
                  <PartnerDashboard />
                </ProtectedRoute>
              }
            />



            {/* ── Catch-all 404 ─────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </main>

        {/* Consumer Footer — hidden on all dashboard routes */}
        {!isDashboard && <Footer />}

        {/* Floating Quick Role Switcher (Development/Demo Helper) */}
        <QuickRoleSwitcher />
      </div>
    </>
  );
}

// ─── Root Export ─────────────────────────────────────────────────
export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppInner />
    </Router>
  );
}