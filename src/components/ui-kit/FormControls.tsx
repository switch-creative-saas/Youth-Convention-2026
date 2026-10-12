import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const formControlClass = 'portal-focus min-h-11 w-full rounded-2xl border border-portal-line bg-portal-surface px-3.5 py-2.5 text-sm text-portal-ink shadow-none outline-none transition-colors placeholder:text-portal-label focus:border-portal-ink disabled:cursor-not-allowed disabled:opacity-50';
export const formLabelClass = 'mb-1.5 block text-xs font-medium text-portal-label';

export function PortalInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(formControlClass, className)} {...props} />;
}

export function PortalSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(formControlClass, className)} {...props} />;
}

export function PortalTextarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(formControlClass, 'min-h-28 resize-y', className)} {...props} />;
}
