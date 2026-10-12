import type { ReactNode } from 'react';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PhotoCard({ src, name, subtitle, badges, className }: { src?: string; name: string; subtitle?: string; badges?: ReactNode; className?: string }) {
  return (
    <figure className={cn('relative isolate min-w-0 overflow-hidden rounded-panel bg-portal-dark font-portal text-white', className)}>
      <div className="aspect-[4/3]">{src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><UserRound aria-hidden="true" className="h-20 w-20 text-white/50" /></div>}</div>
      <figcaption className="flex flex-wrap items-end justify-between gap-3 bg-portal-dark p-5 sm:absolute sm:inset-x-0 sm:bottom-0 sm:bg-black/70">
        <div className="min-w-0 flex-1"><p className="break-words text-xl font-normal">{name}</p>{subtitle && <p className="mt-1 break-words text-sm text-white/80">{subtitle}</p>}</div>
        {badges && <div className="flex min-w-0 flex-wrap gap-2 text-xs [&>span]:rounded-full [&>span]:border [&>span]:border-white/50 [&>span]:px-3 [&>span]:py-1.5">{badges}</div>}
      </figcaption>
    </figure>
  );
}
