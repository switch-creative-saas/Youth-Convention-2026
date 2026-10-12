import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/ui-kit/AppShell';
import { PortalNavigation } from '@/components/ui-kit/PortalNavigation';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortLabel: 'Home', to: '/executive/dashboard' },
  { icon: Calendar, label: 'Convention', shortLabel: 'Event', to: '/executive/convention' },
];

export function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const handleLogout = () => { logout(); navigate('/login'); };
  return <AppShell className="pb-[calc(100px+env(safe-area-inset-bottom))] lg:pb-8">
    <PortalNavigation items={NAV_ITEMS} label="Executive" home="/executive/dashboard" name={user?.name || 'Executive'} onLogout={handleLogout} />
    <main className="min-w-0 max-w-full">
      <h1 className="mb-8 py-4 text-[40px] font-light leading-[1.12] text-portal-ink [overflow-wrap:anywhere] lg:text-[48px]">Welcome back, {user?.name || 'Executive'}</h1>
      {children}
    </main>
  </AppShell>;
}
