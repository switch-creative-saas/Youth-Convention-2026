import { useId } from 'react';

export function RingProgress({ value, total, label, displayValue }: { value: number; total: number; label: string; displayValue?: string }) {
  const id = useId();
  const percentage = total > 0 && Number.isFinite(value) && Number.isFinite(total) ? Math.max(0, Math.min(100, value / total * 100)) : 0;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-60 font-portal" role="progressbar" aria-label={label} aria-valuenow={Math.round(percentage)} aria-valuemin={0} aria-valuemax={100}>
      <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
        <defs><mask id={id}><rect width="200" height="200" fill="white" /><circle cx="100" cy="100" r="84" fill="none" stroke="black" strokeWidth="8" pathLength="100" strokeDasharray={`${percentage} 100`} transform="rotate(-90 100 100)" /></mask></defs>
        <circle cx="100" cy="100" r="84" fill="none" stroke="var(--muted)" strokeWidth="5" pathLength="60" strokeDasharray="0.15 0.85" mask={`url(#${id})`} />
        <circle cx="100" cy="100" r="84" fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray={`${percentage} 100`} transform="rotate(-90 100 100)" opacity={percentage === 0 ? 0 : 1} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-9 text-center text-portal-ink"><p className="max-w-full break-words text-4xl font-light tabular-nums">{displayValue ?? `${Math.round(percentage)}%`}</p><p className="mt-2 text-xs text-portal-label">{label}</p></div>
    </div>
  );
}
