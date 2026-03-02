import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../context/authStore";

/**
 * ProtectedRoute — RBAC-enforced route wrapper
 *
 * Props:
 *   allowedRoles: string[]  e.g. ['customer'], ['admin'], ['rider', 'admin']
 *                           Pass empty array [] to allow ANY authenticated user.
 *   children: JSX element to render if access is granted
 *
 * Behavior:
 *   - Not logged in         → redirect to /signin (saves intended path)
 *   - Wrong role            → redirect to the user's correct dashboard
 *   - Correct role          → renders children
 */

const ROLE_HOME = {
    customer: "/",
    admin: "/admin",
    rider: "/rider",
};

export default function ProtectedRoute({ allowedRoles = [], children }) {
    const { user, token } = useAuthStore();
    const location = useLocation();

    // ── 1. Not authenticated at all ────────────────────────────────────────────
    if (!token || !user) {
        return <Navigate to="/signin" state={{ from: location }} replace />;
    }

    // ── 2. Normalise role (guard against missing/undefined role) ────────────────
    const role = user?.role || "customer";

    // ── 3. Role check (skip if allowedRoles is empty → any role allowed) ────────
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        const redirectTo = ROLE_HOME[role] || "/";
        return <Navigate to={redirectTo} replace />;
    }

    // ── 4. Authorised ✅ ────────────────────────────────────────────────────────
    return children;
}
