import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, UserPlus, Fingerprint, BarChart3, Settings, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/ui-kit/AppShell';
import { PortalNavigation } from '@/components/ui-kit/PortalNavigation';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortLabel: 'Home', to: '/admin/dashboard' },
  { icon: UserPlus, label: 'Registrations', shortLabel: 'Register', to: '/admin/registrations' },
  { icon: Fingerprint, label: 'Attendance', shortLabel: 'Check-in', to: '/admin/attendance' },
  { icon: BarChart3, label: 'Analytics', shortLabel: 'Stats', to: '/admin/analytics' },
  { icon: Settings, label: 'Convention', shortLabel: 'Event', to: '/admin/convention' },
];
const SUPER_ADMIN_ITEMS = [{ icon: ShieldCheck, label: 'Admin Access', shortLabel: 'Access', to: '/admin/access' }];

type AdminLayoutProps = {
  children: ReactNode;
  stats?: ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
};

export function AdminLayout({ children, stats, pageTitle, pageSubtitle }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const items = [...NAV_ITEMS, ...(user?.role === 'super_admin' ? SUPER_ADMIN_ITEMS : [])];
  const handleLogout = () => { logout(); navigate('/login'); };
  return <AppShell className="pb-[calc(100px+env(safe-area-inset-bottom))] lg:pb-8">
    <PortalNavigation items={items} label="Admin" home="/admin/dashboard" name={user?.name || 'Admin'} onLogout={handleLogout} notifications />
    <main className="min-w-0 max-w-full">
      {stats ? (
        <div className="mb-8 flex min-w-0 flex-col gap-8 py-4 xl:flex-row xl:items-end xl:justify-between">
          <h1 className="min-w-0 text-[40px] font-light leading-[1.12] text-portal-ink [overflow-wrap:anywhere] xl:max-w-[380px] xl:text-[48px]">Welcome back, {user?.name || 'Admin'}</h1>
          {stats}
        </div>
      ) : pageTitle ? (
        <header className="mb-8 py-4">
          <h1 className="min-w-0 text-[40px] font-light leading-[1.12] text-portal-ink [overflow-wrap:anywhere] xl:text-[48px]">{pageTitle}</h1>
          {pageSubtitle && <p className="mt-2 max-w-3xl text-sm text-portal-label">{pageSubtitle}</p>}
        </header>
      ) : null}
      {children}
    </main>
  </AppShell>;
}
