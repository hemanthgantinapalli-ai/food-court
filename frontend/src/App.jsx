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

// ---------- Role Dashboards (no shared Header/Footer) ----------
import AdminDashboard from "./pages/AdminDashboard";
import AdminMenu from "./pages/AdminMenu";
import RiderDashboard from "./pages/RiderDashboard";
import RestaurantDashboard from "./pages/RestaurantDashboard";

// ─── Scroll To Top ────────────────────────────────────────────────
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
};

// ─── Paths that should NOT show the consumer Header/Footer ────────
const DASHBOARD_PATHS = ["/admin", "/admin/menu", "/rider", "/restaurant"];

// ─── Inner App (inside Router context) ───────────────────────────
function AppInner() {
  const { pathname } = useLocation();
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
            <Route path="/restaurant/:id" element={<RestaurantDetail />} />
            <Route path="/offers" element={<OffersPage />} />

            {/* ── Customer-Only Routes ──────────────────────── */}
            <Route
              path="/cart"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <CartPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-success"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <PaymentSuccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/track-order"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <TrackOrderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <OrderHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order/:orderId"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
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

            {/* ── Restaurant Dashboard (no consumer Header/Footer) */}
            <Route
              path="/restaurant"
              element={
                <ProtectedRoute allowedRoles={["restaurant"]}>
                  <RestaurantDashboard />
                </ProtectedRoute>
              }
            />

            {/* ── Catch-all 404 ─────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </main>

        {/* Consumer Footer — hidden on all dashboard routes */}
        {!isDashboard && <Footer />}
      </div>
    </>
  );
}

// ─── Root Export ─────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}