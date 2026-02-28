import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';

// Layout & Core
import ProtectedRoute from './features/auth/ProtectedRoute';
import { useAuthListener } from './hooks/useAuthListener';
import CallOverlay from './components/calling/CallOverlay';
import LiveTrackingManager from './components/common/LiveTrackingManager';
import SecuritySirenManager from './components/security/SecuritySirenManager';
import { App as CapacitorApp } from '@capacitor/app';

// Lazy-loaded Pages (Code Splitting)
const Landing3D = lazy(() => import('./pages/Landing3D'));
const Login = lazy(() => import('./pages/auth/Login'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ChangePassword = lazy(() => import('./pages/auth/ChangePassword'));
const About = lazy(() => import('./pages/common/About'));
const Feed = lazy(() => import('./pages/common/Feed'));
const EventMapPage = lazy(() => import('./pages/common/EventMapPage'));
const SafeWalkDetails = lazy(() => import('./pages/common/SafeWalkDetails'));

// Student Pages
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const ReportIncident = lazy(() => import('./pages/student/ReportIncident'));
const SafeWalk = lazy(() => import('./pages/student/SafeWalk'));
const Reports = lazy(() => import('./pages/student/Reports'));
const Messages = lazy(() => import('./pages/student/Messages'));
const Profile = lazy(() => import('./pages/student/Profile'));
const CreatePost = lazy(() => import('./pages/student/CreatePost'));

// Warden Pages
const WardenDashboard = lazy(() => import('./pages/warden/Dashboard'));
const WardenSOS = lazy(() => import('./pages/warden/SOS'));
const WardenReports = lazy(() => import('./pages/warden/Reports'));
const WardenProfile = lazy(() => import('./pages/warden/Profile'));
const WardenBroadcasts = lazy(() => import('./pages/warden/Broadcasts'));
const WardenSOSDetail = lazy(() => import('./pages/warden/WardenSOSDetail'));
const WardenDirectory = lazy(() => import('./pages/warden/Directory'));
const WardenSafeWalk = lazy(() => import('./pages/warden/WardenSafeWalk'));
const WardenReportDetail = lazy(() => import('./pages/warden/WardenReportDetail'));

// Security Pages
const SecurityDashboard = lazy(() => import('./pages/security/Dashboard'));
const SecuritySOSDetail = lazy(() => import('./pages/security/SOSDetail'));
const SecurityMapView = lazy(() => import('./pages/security/MapView'));
const SecurityProfile = lazy(() => import('./pages/security/Profile'));
const SecurityBroadcasts = lazy(() => import('./pages/security/Broadcasts'));
const SafeWalkMonitor = lazy(() => import('./pages/security/SafeWalkMonitor'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const Broadcasts = lazy(() => import('./pages/admin/Broadcasts'));
const AdminSOSDetail = lazy(() => import('./pages/admin/SOSDetail'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));

function AnimatedRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const setupBackButton = async () => {
      const listener = await CapacitorApp.addListener('backButton', () => {
        const rootPaths = [
          '/',
          '/login',
          '/student/dashboard',
          '/security/dashboard',
          '/warden/dashboard',
          '/admin/dashboard'
        ];

        // Check if we are on a root path
        const isRoot = rootPaths.some(path => location.pathname === path || location.pathname.endsWith('/dashboard'));

        if (isRoot) {
          CapacitorApp.exitApp();
        } else {
          navigate(-1);
        }
      });

      return () => {
        listener.remove();
      };
    };

    const cleanup = setupBackButton();
    return () => {
      cleanup.then(clean => clean && clean());
    };
  }, [location, navigate]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing3D />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/about" element={<About />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/report" element={<ReportIncident />} />
          <Route path="/student/safewalk" element={<SafeWalk />} />
          <Route path="/student/messages" element={<Messages />} />
          <Route path="/student/reports" element={<Reports />} />
          <Route path="/student/profile" element={<Profile />} />
          <Route path="/student/create-post" element={<CreatePost />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['warden']} />}>
          <Route path="/warden/dashboard" element={<WardenDashboard />} />
          <Route path="/warden/sos" element={<WardenSOS />} />
          <Route path="/warden/sos/:id" element={<WardenSOSDetail />} />
          <Route path="/warden/map/:id" element={<EventMapPage />} />
          <Route path="/warden/reports" element={<WardenReports />} />
          <Route path="/warden/reports/:id" element={<WardenReportDetail />} />
          <Route path="/warden/messages" element={<Messages />} />
          <Route path="/warden/profile" element={<WardenProfile />} />
          <Route path="/warden/broadcasts" element={<WardenBroadcasts />} />
          <Route path="/warden/directory" element={<WardenDirectory />} />
          <Route path="/warden/safe-walks" element={<WardenSafeWalk />} />
          <Route path="/warden/safe-walk/:id" element={<SafeWalkDetails />} />
        </Route>


        <Route element={<ProtectedRoute allowedRoles={['security']} />}>
          <Route path="/security/dashboard" element={<SecurityDashboard />} />
          <Route path="/security/sos/:id" element={<SecuritySOSDetail />} />
          <Route path="/security/map/:id" element={<EventMapPage />} />
          <Route path="/security/messages" element={<Messages />} />
          <Route path="/security/map" element={<SecurityMapView />} />
          <Route path="/security/profile" element={<SecurityProfile />} />
          <Route path="/security/safe-walks" element={<SafeWalkMonitor />} />
          <Route path="/security/safe-walk/:id" element={<SafeWalkDetails />} />
          <Route path="/security/broadcasts" element={<SecurityBroadcasts />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/logs" element={<AuditLogs />} />
          <Route path="/admin/broadcasts" element={<Broadcasts />} />
          <Route path="/admin/sos/:id" element={<AdminSOSDetail />} />
          <Route path="/admin/map/:id" element={<EventMapPage />} />
          <Route path="/admin/safe-walk/:id" element={<SafeWalkDetails />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  useAuthListener();

  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }>
        <Router>
          <AnimatedRoutes />
          <CallOverlay />
          <LiveTrackingManager />
          <SecuritySirenManager />
        </Router>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
