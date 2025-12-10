import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { user, role, loading, forcePasswordReset } = useAuthStore();
    const location = useLocation();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Force Password Reset Check
    if (forcePasswordReset && location.pathname !== '/change-password') {
        return <Navigate to="/change-password" replace />;
    }

    // Check if allowedRoles are specified and if the user's role is not included
    if (allowedRoles && role && !allowedRoles.includes(role)) {
        // Redirect to their appropriate dashboard based on their actual role
        if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
        if (role === 'warden') return <Navigate to="/warden/dashboard" replace />;
        if (role === 'security') return <Navigate to="/security/dashboard" replace />;
        if (role === 'student') return <Navigate to="/student/dashboard" replace />;
        return <Navigate to="/" replace />; // Fallback redirect
    }

    return <Outlet />;
}
