import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppDataProvider } from '@/contexts/AppDataContext';
import { LoginPage } from '@/pages/LoginPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AdminRegistrations } from '@/pages/AdminRegistrations';
import { AdminAttendance } from '@/pages/AdminAttendance';
import { AdminAnalytics } from '@/pages/AdminAnalytics';
import { AdminSettings } from '@/pages/AdminSettings';
import { AdminAccessManagement } from '@/pages/AdminAccessManagement';
import { MemberRegistration } from '@/pages/MemberRegistration';
import { ExecutiveRegistration } from '@/pages/ExecutiveRegistration';
import { ConventionStatusPortal, ConventionStatusSearchPage } from '@/pages/ConventionStatusPortal';
import { HireDeveloperPage } from '@/pages/HireDeveloperPage';
import { QRCheckinPage } from '@/pages/QRCheckinPage';
import { QROnboardingPage } from '@/pages/QROnboardingPage';
import type { UserRole } from '@/types';

function Spinner() {
  return <div className="portal-theme portal-canvas min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-portal-line border-t-portal-accent rounded-full animate-spin" /></div>;
}

/** Signed-in workspace staff only. `roles` narrows it further (e.g. admins only). */
function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { user, role, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user || !role) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}

const ADMINS: UserRole[] = ['super_admin', 'admin'];

function AppRoutes() {
  const { passwordRecovery } = useAuth();
  if (passwordRecovery) return <ResetPasswordPage />;

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

      <Route path="/admin/dashboard" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
      <Route path="/admin/registrations" element={<RequireAuth><AdminRegistrations /></RequireAuth>} />
      <Route path="/admin/attendance" element={<RequireAuth><AdminAttendance /></RequireAuth>} />
      <Route path="/admin/analytics" element={<RequireAuth><AdminAnalytics /></RequireAuth>} />
      <Route path="/admin/convention" element={<RequireAuth roles={ADMINS}><AdminSettings /></RequireAuth>} />
      <Route path="/admin/access" element={<RequireAuth roles={ADMINS}><AdminAccessManagement /></RequireAuth>} />

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
