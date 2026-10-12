import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

type PillNavItem = { label: string; shortLabel?: string; to: string; icon?: LucideIcon };

export function PillNav({ items, label, className, variant = 'desktop' }: { items: PillNavItem[]; label: string; className?: string; variant?: 'desktop' | 'tabs' }) {
  return (
    <nav aria-label={label} className={cn('flex min-w-0 rounded-full bg-portal-surface p-1 font-portal', variant === 'tabs' ? 'gap-0' : 'flex-wrap gap-0.5', className)}>
      {items.map(({ to, label: itemLabel, shortLabel, icon: Icon }) => (
        <NavLink key={to} to={to} end aria-label={itemLabel} title={itemLabel} className={({ isActive }) => cn('portal-focus inline-flex items-center justify-center rounded-full', variant === 'tabs' ? 'min-h-14 min-w-11 flex-1 flex-col gap-1 px-0.5 py-2 text-[10px]' : 'min-h-11 gap-2 px-2.5 py-2 text-xs xl:px-4', isActive ? 'bg-portal-dark text-white' : 'text-portal-label hover:bg-portal-from')}>
          {variant === 'tabs' && Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />}<span>{variant === 'tabs' ? shortLabel ?? itemLabel : itemLabel}</span>
        </NavLink>
      ))}
    </nav>
  );
}
