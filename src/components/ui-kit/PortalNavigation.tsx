import { Link } from 'react-router-dom';
import { Bell, LogOut, Moon, Sun, User, type LucideIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { PillNav } from './PillNav';
import { PillButton } from './PillButton';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import youthLogo from '@/assets/youth-logo.png';

interface PortalNavigationProps {
  items: { icon: LucideIcon; label: string; shortLabel?: string; to: string }[];
  label: string;
  home: string;
  name: string;
  onLogout?: () => void;
  profileHref?: string;
  notifications?: boolean;
}

export function PortalNavigation({ items, label, home, name, onLogout, profileHref, notifications = false }: PortalNavigationProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  return <>
    <header className="flex min-w-0 items-center justify-between gap-3 py-5 lg:gap-4 lg:py-7 print:hidden">
      <Link to={home} aria-label="MOSYF dashboard" className="portal-focus inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-portal-line px-3 text-sm font-medium text-portal-ink">
        <img src={youthLogo} alt="" className="h-7 w-7 object-contain" />MOSYF
      </Link>
      <PillNav items={items} label={`${label} navigation`} className="hidden lg:flex" />
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <PillButton iconOnly onClick={toggleTheme} aria-label="Change theme" title="Change theme">
          {resolvedTheme === 'dark' ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}
        </PillButton>
        {notifications && <PillButton iconOnly aria-label="Notifications" title="Notifications" className="relative hidden lg:inline-flex">
          <Bell aria-hidden="true" className="h-4 w-4" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
        </PillButton>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <PillButton iconOnly aria-label="Profile menu" title="Profile menu" className="font-medium">{name.split(' ').map(n => n[0]).join('').slice(0, 2)}</PillButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-w-[calc(100vw-32px)] rounded-2xl border-portal-line bg-portal-from p-2 font-portal text-portal-ink shadow-surface">
            <DropdownMenuLabel className="break-words font-medium">{name}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-portal-line" />
            {profileHref && <DropdownMenuItem asChild className="min-h-11 cursor-pointer rounded-full px-3 focus:bg-portal-accent focus:text-portal-accent-ink"><Link to={profileHref}><User aria-hidden="true" className="h-4 w-4" />Profile</Link></DropdownMenuItem>}
            {onLogout && <DropdownMenuItem onSelect={onLogout} className="min-h-11 cursor-pointer rounded-full px-3 focus:bg-portal-accent focus:text-portal-accent-ink"><LogOut aria-hidden="true" className="h-4 w-4" />Logout</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    <div className="fixed bottom-[calc(12px+env(safe-area-inset-bottom))] left-3 right-3 z-40 mx-auto max-w-lg lg:hidden print:hidden">
      <PillNav items={items} label={`${label} mobile navigation`} variant="tabs" className="border border-portal-line bg-portal-from shadow-surface" />
    </div>
  </>;
}
