import type { LucideIcon } from 'lucide-react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChecklistItem = { id: string; label: string; detail?: string; done: boolean; icon?: LucideIcon };

export function DarkChecklistCard({ title, items, emptyMessage = 'No items yet.', className }: { title: string; items: ChecklistItem[]; emptyMessage?: string; className?: string }) {
  return (
    <section className={cn('min-w-0 rounded-panel bg-portal-dark p-6 font-portal text-white', className)}>
      <div className="mb-6 flex items-center justify-between gap-3"><h2 className="text-base font-normal">{title}</h2><p className="text-3xl font-light tabular-nums" aria-label={`${items.filter(item => item.done).length} of ${items.length} completed`}>{items.filter(item => item.done).length}/{items.length}</p></div>
      {items.length === 0 ? <p className="text-sm text-white/70">{emptyMessage}</p> : (
        <ul className="space-y-5">{items.map(({ id, label, detail, done, icon: Icon = Circle }) => (
          <li key={id} className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10"><Icon aria-hidden="true" className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><p className={cn('break-words text-sm', done && 'text-white/70 line-through')}>{label}</p>{detail && <p className="mt-1 break-words text-xs text-white/70">{detail}</p>}</div>
            <span aria-label={done ? 'Completed' : 'Pending'} className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full', done ? 'bg-portal-accent text-portal-accent-ink' : 'border border-white/40')}>{done && <Check aria-hidden="true" className="h-3 w-3" />}</span>
          </li>
        ))}</ul>
      )}
    </section>
  );
}
