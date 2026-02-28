import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../context/authStore";

/**
 * ProtectedRoute — RBAC-enforced route wrapper
 *
 * Props:
 *   allowedRoles: string[] — e.g. ['customer'], ['admin'], ['rider', 'admin']
 *   children: JSX element to render if access granted
 *
 * Behavior:
 *   - Not logged in         → redirect to /signin (saves intended path)
 *   - Wrong role            → redirect to the user's correct dashboard
 *   - Correct role          → renders children
 */

const ROLE_HOME = {
    customer: "/",
    admin: "/admin",
    restaurant: "/restaurant",
    rider: "/rider",
};

export default function ProtectedRoute({ allowedRoles = [], children }) {
    const { user, token } = useAuthStore();
    const location = useLocation();

    // 1. Not authenticated at all
    if (!token || !user) {
        return <Navigate to="/signin" state={{ from: location }} replace />;
    }

    // 2. Authenticated but wrong role
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        const redirectTo = ROLE_HOME[user.role] || "/";
        return <Navigate to={redirectTo} replace />;
    }

    // 3. Authorised ✅
    return children;
}
