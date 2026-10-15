import { Clock, MapPin } from 'lucide-react';
import { formatClock, formatDayHeading } from '@/lib/format';
import type { TimetableSession } from '@/types';

/** Groups sessions by day, keeping the order they arrive in (already sorted by date and time). */
function groupSessionsByDay(sessions: TimetableSession[]) {
  const days = new Map<string, TimetableSession[]>();
  sessions.forEach(session => days.set(session.date, [...(days.get(session.date) ?? []), session]));
  return [...days.entries()].map(([date, items]) => ({ date, sessions: items }));
}

/**
 * Convention sessions grouped by day. `sheet` is the white, print-ready variant used on the
 * timetable page; `portal` follows the portal theme (status page).
 * Locations equal to `hideLocation` (usually the venue) are not repeated on every row.
 */
export function ConventionTimetable({ sessions, variant = 'portal', hideLocation }: { sessions: TimetableSession[]; variant?: 'portal' | 'sheet'; hideLocation?: string | null }) {
  const days = groupSessionsByDay(sessions);
  const sheet = variant === 'sheet';
  if (days.length === 0) {
    return <p className={`text-sm ${sheet ? 'text-gray-500' : 'text-portal-label'}`}>The timetable has not been published yet. Check back soon.</p>;
  }
  return (
    <div className="space-y-6">
      {days.map((day, dayIndex) => (
        <section key={day.date}>
          <div className={`mb-3 flex flex-wrap items-baseline gap-x-3 border-b pb-2 ${sheet ? 'border-gray-300' : 'border-portal-line'}`}>
            <span className={`text-xs font-bold uppercase tracking-[0.16em] ${sheet ? 'text-[#069d92]' : 'text-portal-label'}`}>Day {dayIndex + 1}</span>
            <h3 className={`text-lg font-black ${sheet ? 'text-gray-900' : 'text-portal-ink'}`}>{formatDayHeading(day.date)}</h3>
          </div>
          <ol className="space-y-2">
            {day.sessions.map(session => (
              <li key={`${session.date}-${session.startTime}-${session.title}`} className={`grid grid-cols-[88px_1fr] gap-3 rounded-2xl p-3 [break-inside:avoid] sm:grid-cols-[150px_1fr] ${sheet ? 'border border-gray-200 bg-white' : 'border border-portal-line bg-portal-surface'}`}>
                <div className={`flex items-start gap-1.5 font-mono text-xs font-bold leading-5 sm:text-sm ${sheet ? 'text-[#0b4a43]' : 'text-portal-ink'}`}>
                  <Clock className="mt-0.5 hidden h-3.5 w-3.5 shrink-0 sm:block print:hidden" />
                  <span>{formatClock(session.startTime)}<span className="hidden sm:inline"> – </span><br className="sm:hidden" />{formatClock(session.endTime)}</span>
                </div>
                <div className="min-w-0">
                  <p className={`font-bold ${sheet ? 'text-gray-900' : 'text-portal-ink'}`}>{session.title}</p>
                  {session.description && <p className={`mt-0.5 text-sm ${sheet ? 'text-gray-600' : 'text-portal-label'}`}>{session.description}</p>}
                  {session.location && session.location !== hideLocation && (
                    <p className={`mt-1 flex items-center gap-1 text-xs ${sheet ? 'text-gray-500' : 'text-portal-label'}`}><MapPin className="h-3 w-3 shrink-0" /> {session.location}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
