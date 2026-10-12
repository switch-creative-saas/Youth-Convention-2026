import { Link, useLocation } from 'react-router-dom';
import { Code2, Search, Ticket } from 'lucide-react';

type AttendeePortalNavProps = {
  token?: string;
  darkSurface?: boolean;
};

export function AttendeePortalNav({ token }: AttendeePortalNavProps) {
  const location = useLocation();
  const statusPath = token ? `/convention/status/${token}` : '/convention/status';
  const hirePath = token ? `/convention/status/${token}/hire` : '/convention/hire';

  const items = [
    { label: token ? 'My Status' : 'Status Search', href: statusPath, icon: token ? Ticket : Search },
    { label: 'Hire a Developer', href: hirePath, icon: Code2 },
  ];

  return (
    <nav aria-label="Personal convention portal" className="mx-auto mb-8 flex max-w-5xl flex-wrap items-center gap-2 rounded-full border border-portal-line bg-portal-surface p-1.5">
      {items.map(item => {
        const active = location.pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            to={item.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-accent sm:flex-none ${
              active
                ? 'bg-portal-dark text-white'
                : 'text-portal-label hover:bg-portal-surface hover:text-portal-ink'
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
