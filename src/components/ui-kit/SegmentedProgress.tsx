import { cn } from '@/lib/utils';

type ProgressSegment = { label: string; value: number; tone: 'dark' | 'accent' | 'hatched' | 'outline' };

export function SegmentedProgress({ segments, className }: { segments: ProgressSegment[]; className?: string }) {
  return (
    <div className={cn('grid min-w-0 grid-cols-2 gap-3 font-portal sm:flex sm:flex-wrap', className)}>
      {segments.map(({ label, value, tone }) => {
        const percent = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
        return (
          <div key={label} className="min-w-0 sm:min-w-24 sm:flex-1">
            <p className="mb-2 text-xs text-portal-label">{label}</p>
            <div role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}
              className={cn('flex min-h-9 items-center rounded-full border px-3 text-xs tabular-nums', tone === 'dark' ? 'border-transparent bg-portal-dark text-white' : tone === 'accent' ? 'border-transparent bg-portal-accent text-portal-accent-ink' : tone === 'hatched' ? 'portal-hatched border-portal-line text-portal-ink' : 'border-portal-line text-portal-ink')}>
              {Math.round(percent)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
