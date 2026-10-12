import { Code2, Home, CreditCard, CheckCircle, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/ui-kit/AppShell';
import { PortalNavigation } from '@/components/ui-kit/PortalNavigation';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', to: '/member/home' },
  { icon: CreditCard, label: 'My ID', to: '/member/id' },
  { icon: CheckCircle, label: 'Attendance', shortLabel: 'Check-in', to: '/member/attendance' },
  { icon: User, label: 'Profile', to: '/member/profile' },
  { icon: Code2, label: 'Hire a Developer', shortLabel: 'Developer', to: '/convention/hire' },
];

export function MemberLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <AppShell className="pb-[calc(100px+env(safe-area-inset-bottom))] lg:pb-8">
    <PortalNavigation items={NAV_ITEMS} label="Member" home="/member/home" name={user?.name || 'Member'} profileHref="/member/profile" />
    <main className="min-w-0 max-w-full pt-2">{children}</main>
  </AppShell>;
}
