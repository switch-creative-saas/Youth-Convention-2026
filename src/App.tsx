import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppDataProvider } from '@/contexts/AppDataContext';
import { LoginPage } from '@/pages/LoginPage';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AdminRegistrations } from '@/pages/AdminRegistrations';
import { AdminAttendance } from '@/pages/AdminAttendance';
import { AdminAnalytics } from '@/pages/AdminAnalytics';
import { AdminSettings } from '@/pages/AdminSettings';
import { AdminAccessManagement } from '@/pages/AdminAccessManagement';
import { ExecutiveDashboard } from '@/pages/ExecutiveDashboard';
import { MemberHome } from '@/pages/MemberHome';
import { MemberID } from '@/pages/MemberID';
import { MemberAttendance } from '@/pages/MemberAttendance';
import { MemberProfile } from '@/pages/MemberProfile';
import { MemberRegistration } from '@/pages/MemberRegistration';
import { ExecutiveRegistration } from '@/pages/ExecutiveRegistration';
import { ConventionStatusPortal, ConventionStatusSearchPage } from '@/pages/ConventionStatusPortal';
import { HireDeveloperPage } from '@/pages/HireDeveloperPage';
import { QRCheckinPage } from '@/pages/QRCheckinPage';
import { QROnboardingPage } from '@/pages/QROnboardingPage';
import { MemberLayout } from '@/components/MemberLayout';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth();
  if (isLoading) return <div className="portal-theme portal-canvas min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-portal-line border-t-portal-accent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== 'super_admin' && role !== 'admin') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth();
  if (isLoading) return <div className="portal-theme portal-canvas min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-portal-line border-t-portal-accent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== 'super_admin') return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}

function ExecutiveRoute({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth();
  if (isLoading) return <div className="portal-theme portal-canvas min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-portal-line border-t-portal-accent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== 'executive') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function MemberRoute({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth();
  if (isLoading) return <div className="portal-theme portal-canvas min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-portal-line border-t-portal-accent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== 'member') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register/member" element={<MemberRegistration />} />
      <Route path="/register/executive" element={<ExecutiveRegistration />} />
      <Route path="/convention/status" element={<ConventionStatusSearchPage />} />
      <Route path="/convention/status/:token" element={<ConventionStatusPortal />} />
      <Route path="/convention/hire" element={<HireDeveloperPage />} />
      <Route path="/convention/status/:token/hire" element={<HireDeveloperPage />} />
      <Route path="/qr/:token" element={<QRCheckinPage />} />
      <Route path="/qr-checkin/:token" element={<QROnboardingPage />} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/registrations" element={<AdminRoute><AdminRegistrations /></AdminRoute>} />
      <Route path="/admin/attendance" element={<AdminRoute><AdminAttendance /></AdminRoute>} />
      <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
      <Route path="/admin/convention" element={<AdminRoute><AdminSettings /></AdminRoute>} />
      <Route path="/admin/access" element={<SuperAdminRoute><AdminAccessManagement /></SuperAdminRoute>} />

      {/* Executive Routes */}
      <Route path="/executive/dashboard" element={<ExecutiveRoute><ExecutiveDashboard /></ExecutiveRoute>} />
      <Route path="/executive/convention" element={<ExecutiveRoute><ExecutiveDashboard /></ExecutiveRoute>} />

      {/* Member Routes */}
      <Route path="/member/home" element={<MemberRoute><MemberLayout><MemberHome /></MemberLayout></MemberRoute>} />
      <Route path="/member/id" element={<MemberRoute><MemberLayout><MemberID /></MemberLayout></MemberRoute>} />
      <Route path="/member/attendance" element={<MemberRoute><MemberLayout><MemberAttendance /></MemberLayout></MemberRoute>} />
      <Route path="/member/profile" element={<MemberRoute><MemberLayout><MemberProfile /></MemberLayout></MemberRoute>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppDataProvider>
              <AppRoutes />
            </AppDataProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
