import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BigStat({ value, label, icon: Icon, className, detail, labelBadge }: { value: number | string; label: string; icon?: LucideIcon; className?: string; detail?: ReactNode; labelBadge?: ReactNode }) {
  return (
    <div className={cn('min-w-0 font-portal text-portal-ink', className)}>
      <p className="break-words text-[56px] font-light leading-none tabular-nums [overflow-wrap:anywhere] 2xl:text-[64px]">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-portal-label"><span className="inline-flex items-center gap-1.5">{Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}{label}</span>{labelBadge}</div>
      {detail && <div className="mt-3 text-xs text-portal-label">{detail}</div>}
    </div>
  );
}
