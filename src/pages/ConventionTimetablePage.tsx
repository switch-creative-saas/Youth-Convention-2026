import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, MapPin, Printer, XCircle } from 'lucide-react';
import youthLogo from '@/assets/youth-logo.png';
import { ConventionTimetable } from '@/components/timetable/ConventionTimetable';
import { getEventTimetable, type EventTimetable } from '@/lib/api';
import { formatDayHeading } from '@/lib/format';

function dateRange(start: string, end: string) {
  const year = new Date(`${end}T00:00:00`).getFullYear();
  return start === end ? `${formatDayHeading(start)} ${year}` : `${formatDayHeading(start)} – ${formatDayHeading(end)} ${year}`;
}

const printColors = 'print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]';

/**
 * Public, print-ready convention timetable: /convention/timetable/{workspace slug}.
 * "Print or save as PDF" opens the browser's print dialog, which saves a PDF on phones and computers.
 * ?back={status token} adds a link back to the attendee's status page.
 */
export function ConventionTimetablePage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const backToken = params.get('back');
  const [result, setResult] = useState<{ slug?: string; timetable: EventTimetable | null }>({ timetable: null });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    getEventTimetable(slug)
      .then(timetable => { if (!cancelled) setResult({ slug, timetable }); })
      .catch(() => { if (!cancelled) setResult({ slug, timetable: null }); });
    return () => { cancelled = true; };
  }, [slug]);

  const loading = Boolean(slug) && result.slug !== slug;
  const timetable = result.slug === slug ? result.timetable : null;

  // The document title becomes the default file name when saving as PDF.
  useEffect(() => {
    if (!timetable) return;
    const previous = document.title;
    document.title = `${timetable.event.name} – Timetable`;
    return () => { document.title = previous; };
  }, [timetable]);

  if (loading) {
    return <main className="portal-theme portal-canvas grid min-h-screen place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-portal-line border-t-portal-accent" /></main>;
  }

  if (!timetable) {
    return (
      <main className="portal-theme portal-canvas grid min-h-screen place-items-center px-4">
        <div className="max-w-md rounded-[28px] border border-portal-line bg-portal-surface p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-300" />
          <h1 className="mt-5 text-2xl font-black text-portal-ink">Timetable not found</h1>
          <p className="mt-3 text-sm leading-6 text-portal-label">This link is invalid or there is no active convention right now.</p>
        </div>
      </main>
    );
  }

  const { event } = timetable;
  return (
    <main className="portal-theme portal-canvas min-h-screen px-4 py-6 sm:py-10 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3">
        {backToken ? (
          <Link to={`/convention/status/${backToken}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-portal-line bg-portal-surface px-4 text-sm font-bold text-portal-ink"><ArrowLeft className="h-4 w-4" /> My status</Link>
        ) : <span />}
        <button onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-portal-dark px-5 text-sm font-bold text-white">
          <Printer className="h-4 w-4" /> Print or save as PDF
        </button>
      </div>

      <article className="mx-auto max-w-3xl overflow-hidden rounded-[28px] bg-white text-gray-900 shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <header className={`bg-[#0b4a43] px-6 py-6 text-white sm:px-8 ${printColors}`}>
          <div className="flex items-center gap-4">
            <img src={youthLogo} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9fe3dc]">{timetable.workspaceName}</p>
              <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">{event.name}</h1>
            </div>
          </div>
          <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-[#ff9f00]">Convention timetable</p>
        </header>
        <div className={`h-1.5 bg-[#ff9f00] ${printColors}`} />

        <div className="px-6 py-6 sm:px-8">
          <div className={`mb-6 grid gap-2 rounded-2xl bg-[#fff6e5] p-4 text-sm ${printColors}`}>
            {event.theme && <p><span className="font-bold">Theme:</span> {event.theme}{event.scripture ? ` (${event.scripture})` : ''}</p>}
            <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#b36b00]" /> {dateRange(event.startDate, event.endDate)}</p>
            {event.venue && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#b36b00]" /> {event.venue}</p>}
          </div>
          <ConventionTimetable sessions={timetable.programmes} variant="sheet" hideLocation={event.venue} />
          <p className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-500">Times may change. The latest timetable is always on this page and on your convention status page.</p>
        </div>
      </article>
    </main>
  );
}
