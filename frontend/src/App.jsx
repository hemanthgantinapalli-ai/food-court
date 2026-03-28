import React, { useEffect, Suspense, lazy } from "react";
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
import CartConflictModal from "./components/CartConflictModal";
import { useAuthStore } from "./context/authStore";

// ---------- Loading component ----------
const LoadingPage = () => (
  <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
    <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
    <p className="text-slate-400 font-medium animate-pulse">Loading Deliciousness...</p>
  </div>
);

// ---------- Customer Pages (Lazy Loaded) ----------
const Home = lazy(() => import("./pages/Home"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const RestaurantDetail = lazy(() => import("./pages/RestaurantDetail"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const OffersPage = lazy(() => import("./pages/OffersPage"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage"));
const OrderHistoryPage = lazy(() => import("./pages/OrderHistoryPage"));
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));

// ---------- Role Dashboards (Lazy Loaded) ----------
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminMenu = lazy(() => import("./pages/AdminMenu"));
const AdminSignIn = lazy(() => import("./pages/AdminSignIn"));
const AdminSignUp = lazy(() => import("./pages/AdminSignUp"));
const RiderDashboard = lazy(() => import("./pages/RiderDashboard"));
const RiderSignIn = lazy(() => import("./pages/RiderSignIn"));
const RestaurantSignIn = lazy(() => import("./pages/RestaurantSignIn"));
const RestaurantSignUp = lazy(() => import("./pages/RestaurantSignUp"));
const PartnerDashboard = lazy(() => import("./pages/PartnerDashboard"));

// ─── Scroll To Top ────────────────────────────────────────────────
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
};

// ─── Paths that should NOT show the consumer Header/Footer ────────
const DASHBOARD_PATHS = [
  "/admin", "/admin/menu", "/admin/login", "/admin/signup", 
  "/rider", "/rider/login", "/partner", "/restaurant/login", "/restaurant/signup"
];

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
          <Suspense fallback={<LoadingPage />}>
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
                  <ProtectedRoute allowedRoles={["customer", "admin", "rider", "restaurant"]}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["customer"]}>
                    <CustomerDashboard />
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
                path="/notifications"
                element={
                  <ProtectedRoute allowedRoles={["customer", "admin", "rider", "restaurant"]}>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/order/:orderId"
                element={
                  <ProtectedRoute allowedRoles={["customer", "admin"]}>
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
          </Suspense>
        </main>

        {/* Consumer Footer — hidden on all dashboard routes */}
        {!isDashboard && <Footer />}

        {/* Global Modal for Cart Conflict Management */}
        <CartConflictModal />

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