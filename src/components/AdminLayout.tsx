import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UserPlus, Fingerprint, BarChart3, Settings, ShieldCheck, CalendarPlus, ScanLine } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { AppShell } from '@/components/ui-kit/AppShell';
import { PortalNavigation } from '@/components/ui-kit/PortalNavigation';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', shortLabel: 'Home', to: '/admin/dashboard' },
  { icon: UserPlus, label: 'Registrations', shortLabel: 'Register', to: '/admin/registrations' },
  { icon: ScanLine, label: 'Scan Tags', shortLabel: 'Scan', to: '/admin/scan' },
  { icon: Fingerprint, label: 'Attendance', shortLabel: 'Check-in', to: '/admin/attendance' },
  { icon: BarChart3, label: 'Analytics', shortLabel: 'Stats', to: '/admin/analytics' },
];
const ADMIN_ITEMS = [
  { icon: Settings, label: 'Convention', shortLabel: 'Event', to: '/admin/convention' },
  { icon: ShieldCheck, label: 'Access', shortLabel: 'Access', to: '/admin/access' },
];

type AdminLayoutProps = {
  children: ReactNode;
  stats?: ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  /** Show an empty state instead of the page until a convention is active. */
  requiresEvent?: boolean;
};

export function AdminLayout({ children, stats, pageTitle, pageSubtitle, requiresEvent = true }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { logout, user, isPlatformAdmin } = useAuth();
  const { workspaces, currentWorkspace, setCurrentWorkspaceId, currentEvent, loading, error } = useAppData();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const items = [...NAV_ITEMS, ...(isAdmin ? ADMIN_ITEMS : [])];
  const handleLogout = async () => { await logout(); navigate('/login'); };

  let content: ReactNode = children;
  if (loading && !currentWorkspace) {
    content = <div className="grid min-h-[40vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-portal-line border-t-portal-accent" /></div>;
  } else if (!currentWorkspace) {
    content = <EmptyState title={isPlatformAdmin ? 'No workspaces yet' : 'No workspace assigned'} body={isPlatformAdmin ? 'Create a workspace for an admin from the Access page.' : 'Ask the platform owner to add you to a convention workspace.'} action={isPlatformAdmin ? { to: '/admin/access', label: 'Open Access' } : undefined} />;
  } else if (requiresEvent && !currentEvent && !loading) {
    content = <EmptyState title="No active convention" body={isAdmin ? 'Create your convention (name, dates, venue) and set up bands, departments, groups and locations before sharing registration links.' : 'An admin has not set up the convention yet.'} action={isAdmin ? { to: '/admin/convention', label: 'Set up convention' } : undefined} />;
  }

  return <AppShell className="pb-[calc(100px+env(safe-area-inset-bottom))] lg:pb-8">
    <PortalNavigation items={items} label="Admin" home="/admin/dashboard" name={user?.name || 'Admin'} onLogout={handleLogout} />
    <main className="min-w-0 max-w-full">
      {(workspaces.length > 1 || currentEvent) && (
        <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-portal-label">
          {workspaces.length > 1 ? (
            <select
              aria-label="Workspace"
              value={currentWorkspace?.id ?? ''}
              onChange={event => setCurrentWorkspaceId(event.target.value)}
              className="portal-focus min-h-9 rounded-full border border-portal-line bg-portal-from px-3 text-xs text-portal-ink"
            >
              {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
            </select>
          ) : currentWorkspace && <span className="portal-tag">{currentWorkspace.name}</span>}
          {currentEvent && <span className="portal-tag">{currentEvent.name}</span>}
        </div>
      )}
      {error && <p role="alert" className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {stats && currentEvent ? (
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
      {content}
    </main>
  </AppShell>;
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: { to: string; label: string } }) {
  return (
    <div className="portal-card mx-auto mt-6 max-w-xl rounded-[28px] p-8 text-center">
      <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-portal-line text-portal-ink"><CalendarPlus className="h-5 w-5" /></span>
      <h2 className="text-xl font-medium text-portal-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-portal-label">{body}</p>
      {action && <Link to={action.to} className="portal-focus mt-6 inline-flex min-h-11 items-center rounded-full bg-portal-dark px-5 text-sm font-medium text-white">{action.label}</Link>}
    </div>
  );
}
