import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Landing3D from './pages/Landing3D';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ChangePassword from './pages/auth/ChangePassword';
import StudentDashboard from './pages/student/Dashboard';
import ReportIncident from './pages/student/ReportIncident';
import SafeWalk from './pages/student/SafeWalk';
import Reports from './pages/student/Reports';
import Messages from './pages/student/Messages';
import Profile from './pages/student/Profile';
import WardenDashboard from './pages/warden/Dashboard';
import WardenSOS from './pages/warden/SOS';
import WardenReports from './pages/warden/Reports';
import WardenProfile from './pages/warden/Profile';
import SecurityDashboard from './pages/security/Dashboard';
import SecuritySOSDetail from './pages/security/SOSDetail';
import SecurityMapView from './pages/security/MapView';
import SecurityPatrol from './pages/security/Patrol';
import SecurityProfile from './pages/security/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import SystemSettings from './pages/admin/SystemSettings';
import AuditLogs from './pages/admin/AuditLogs';
import Broadcasts from './pages/admin/Broadcasts';
import AdminSOSDetail from './pages/admin/SOSDetail';
import ProtectedRoute from './features/auth/ProtectedRoute';
import { useAuthListener } from './hooks/useAuthListener';
import WardenBroadcasts from './pages/warden/Broadcasts';
import WardenSOSDetail from './pages/warden/WardenSOSDetail';
import WardenDirectory from './pages/warden/Directory';
import CallOverlay from './components/calling/CallOverlay';


function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing3D />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePassword />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/report" element={<ReportIncident />} />
          <Route path="/student/safewalk" element={<SafeWalk />} />
          <Route path="/student/messages" element={<Messages />} />
          <Route path="/student/reports" element={<Reports />} />
          <Route path="/student/profile" element={<Profile />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['warden']} />}>
          <Route path="/warden/dashboard" element={<WardenDashboard />} />
          <Route path="/warden/sos" element={<WardenSOS />} />
          <Route path="/warden/sos/:id" element={<WardenSOSDetail />} />
          <Route path="/warden/reports" element={<WardenReports />} />
          <Route path="/warden/messages" element={<Messages />} />
          <Route path="/warden/profile" element={<WardenProfile />} />
          <Route path="/warden/broadcasts" element={<WardenBroadcasts />} />
          <Route path="/warden/directory" element={<WardenDirectory />} />
        </Route>


        <Route element={<ProtectedRoute allowedRoles={['security']} />}>
          <Route path="/security/dashboard" element={<SecurityDashboard />} />
          <Route path="/security/sos/:id" element={<SecuritySOSDetail />} />
          <Route path="/security/messages" element={<Messages />} />
          <Route path="/security/map" element={<SecurityMapView />} />
          <Route path="/security/patrol" element={<SecurityPatrol />} />
          <Route path="/security/profile" element={<SecurityProfile />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/settings" element={<SystemSettings />} />
          <Route path="/admin/logs" element={<AuditLogs />} />
          <Route path="/admin/broadcasts" element={<Broadcasts />} />
          <Route path="/admin/sos/:id" element={<AdminSOSDetail />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  useAuthListener();

  console.log("App: Rendering Shell");

  return (
    <Router>
      <AnimatedRoutes />
      <CallOverlay />
    </Router>
  );
}

export default App;
