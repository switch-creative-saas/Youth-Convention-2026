import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export type CardProps = ComponentProps<'div'> & { hover?: boolean };

export function Card({ children, className, hover = false, onClick, onKeyDown, ...props }: CardProps) {
  return (
    <div {...props} onClick={onClick}
      role={onClick ? 'button' : props.role} tabIndex={onClick ? (props.tabIndex ?? 0) : props.tabIndex}
      onKeyDown={event => {
        onKeyDown?.(event);
        if (onClick && !event.defaultPrevented && event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      className={cn('portal-card p-5 sm:p-6', hover && 'portal-card-hover', onClick && 'portal-focus cursor-pointer', className)}>
      {children}
    </div>
  );
}
