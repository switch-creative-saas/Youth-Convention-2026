import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type PillButtonProps = ComponentProps<'button'> & {
  variant?: 'accent' | 'outline' | 'dark';
  iconOnly?: boolean;
};

export function PillButton({ variant = 'outline', iconOnly = false, className, type = 'button', ...props }: PillButtonProps) {
  return <button {...props} type={type} className={cn(
    'portal-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 py-2 font-portal text-sm font-medium transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
    variant === 'accent' ? 'border-transparent bg-portal-accent text-portal-accent-ink' : variant === 'dark' ? 'border-transparent bg-portal-dark text-white' : 'border-portal-line bg-transparent text-portal-ink',
    iconOnly && 'h-11 w-11 shrink-0 p-0', className,
  )} />;
}
