import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { cn } from '@/lib/utils';

export function AppShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.22 }}>
      <div className="portal-theme portal-canvas min-h-screen print:contents">
        <div className={cn('portal-shell print:contents', className)}>{children}</div>
      </div>
    </MotionConfig>
  );
}
