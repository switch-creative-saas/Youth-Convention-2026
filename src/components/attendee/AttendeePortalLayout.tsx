import type { ReactNode } from 'react';
import { AuthHeader } from '@/components/auth/AuthExperience';
import { AttendeePortalNav } from './AttendeePortalNav';

export function AttendeePortalLayout({ children, token, darkSurface = false, compact = false }: { children: ReactNode; token?: string; darkSurface?: boolean; compact?: boolean }) {
  return (
    <main className="portal-theme portal-canvas min-h-screen">
      <AuthHeader eyebrow="Convention Status" homeHref={token ? `/convention/status/${token}` : '/convention/status'} hireDeveloperHref={token ? `/convention/status/${token}/hire` : '/convention/hire'} />
      <section className={`mx-auto px-4 pb-12 pt-28 ${compact ? 'max-w-3xl' : 'max-w-5xl'}`}>
        <AttendeePortalNav token={token} darkSurface={darkSurface} />
        {children}
      </section>
    </main>
  );
}
