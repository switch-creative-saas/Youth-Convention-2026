import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type StatusPillProps = ComponentProps<'span'> & {
  tone?: 'accent' | 'dark' | 'neutral' | 'outline';
};

export function StatusPill({ tone = 'neutral', className, ...props }: StatusPillProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex min-h-6 items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.04em]',
        tone === 'accent' && 'bg-portal-accent text-portal-accent-ink',
        tone === 'dark' && 'bg-portal-dark text-white',
        tone === 'outline' && 'border border-portal-line text-portal-ink',
        tone === 'neutral' && 'bg-portal-surface text-portal-label',
        className,
      )}
    />
  );
}
