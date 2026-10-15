import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, CalendarDays, Check, Clock, Download, Gift, Printer, Search, ShieldCheck, Ticket, Trophy, Utensils, XCircle } from 'lucide-react';
import { ConventionTimetable } from '@/components/timetable/ConventionTimetable';
import { ExecutiveConventionTag, ConventionTag, type TagAttendee } from '@/components/ConventionTag';
import { AttendeePortalLayout } from '@/components/attendee/AttendeePortalLayout';
import { findAttendeeStatus, getAttendeeStatus, type AttendeeStatus } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { photoUrl } from '@/lib/supabase';
import { downloadTagImage } from '@/lib/tagImage';
import type { AccessItemType } from '@/types';

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function Countdown({ date }: { date: string }) {
  const target = useMemo(() => new Date(date + 'T00:00:00').getTime(), [date]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  return (
    <div className="grid grid-cols-3 gap-2">
      {[['Days', days], ['Hours', hours], ['Minutes', minutes]].map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-white/12 bg-portal-surface p-3 text-center backdrop-blur-xl">
          <p className="font-mono text-2xl font-black text-portal-ink">{String(value).padStart(2, '0')}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-portal-label">{label}</p>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ complete, label }: { complete: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${complete ? 'bg-portal-surface text-portal-ink dark:text-portal-ink' : 'bg-amber-500/10 text-amber-600 dark:text-amber-300'}`}>
      {complete ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function TimelineItem({ complete, title, detail, icon: Icon }: { complete: boolean; title: string; detail?: string; icon: typeof BadgeCheck }) {
  return (
    <div className="flex gap-3">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${complete ? 'bg-portal-dark text-white' : 'bg-portal-surface text-portal-label dark:bg-portal-surface dark:text-portal-label'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 border-b border-portal-line pb-4 dark:border-white/8">
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-portal-ink dark:text-portal-ink">{title}</p>
          <StatusPill complete={complete} label={complete ? 'Done' : 'Pending'} />
        </div>
        {detail && <p className="mt-1 text-sm text-portal-label dark:text-portal-label">{detail}</p>}
      </div>
    </div>
  );
}

function tagFromStatus(status: AttendeeStatus): TagAttendee {
  const isMember = status.kind === 'member';
  return {
    fullName: status.fullName,
    code: status.code,
    conventionGroup: status.groupName ?? (isMember ? 'Unassigned' : 'Executive'),
    fellowshipBand: status.bandName ?? 'None',
    leadershipRole: status.leadershipRole ?? '',
    departments: status.departments,
    profilePhoto: photoUrl(status.photoPath),
  };
}

function TagDownloadButton({ status, label = 'Download Tag (PNG)' }: { status: AttendeeStatus; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const download = async () => {
    setBusy(true); setError('');
    try {
      await downloadTagImage(tagFromStatus(status), status.event.name, status.kind);
    } catch {
      setError('Could not create the image. Use Print and choose "Save as PDF" instead.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button onClick={() => void download()} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-portal-dark px-5 py-3 text-sm font-bold text-white disabled:opacity-70">
        <Download className="h-4 w-4" /> {busy ? 'Preparing…' : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </>
  );
}

function AttendeePass({ status, token }: { status: AttendeeStatus; token: string }) {
  const isMember = status.kind === 'member';
  const claim = (item: AccessItemType) => status.accessClaims[item];
  const firstCheckIn = status.attendance[0];
  const tag = tagFromStatus(status);

  return (
    <AttendeePortalLayout token={token} darkSurface>
      <div className="mx-auto max-w-5xl">
        <motion.div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-portal-surface p-5 shadow-[0_28px_90px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative z-10 grid gap-8 lg:grid-cols-[0.82fr_1fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-portal-ink">{status.workspaceName}</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">{status.event.name}</h1>
              {status.event.theme && <p className="mt-2 text-sm text-portal-label">Theme: {status.event.theme}</p>}
              <p className="mt-4 text-lg font-semibold">Hello, {firstName(status.fullName)}.</p>
              <p className="mt-2 text-sm leading-6 text-portal-label">You're registered. This digital pass updates as your convention activity is recorded.</p>

              <div className="mt-6 rounded-3xl border border-white/10 bg-portal-surface p-4">
                <Countdown date={status.event.startDate} />
                <div className="mt-5 grid gap-3 text-sm text-portal-label">
                  <p><CalendarDays className="mr-2 inline h-4 w-4 text-portal-ink" /> {new Date(`${status.event.startDate}T00:00:00`).toLocaleDateString()} - {new Date(`${status.event.endDate}T00:00:00`).toLocaleDateString()}</p>
                  {status.event.venue && <p><Ticket className="mr-2 inline h-4 w-4 text-portal-ink" /> {status.event.venue}</p>}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-portal-surface p-4 text-portal-ink">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-3xl bg-portal-surface">
                  {tag.profilePhoto ? <img src={tag.profilePhoto} alt={status.fullName} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-2xl font-black">{status.fullName.slice(0, 2).toUpperCase()}</div>}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-2xl font-black">{status.fullName}</p>
                  <p className="font-mono text-sm text-portal-ink">{status.code}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusPill complete label="Registered" />
                    {status.biometricVerified && <StatusPill complete label="Verified" />}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Info label={isMember ? 'Band' : 'Role'} value={isMember ? tag.fellowshipBand : tag.leadershipRole || '—'} />
                <Info label="Department" value={status.departments.join(', ') || '—'} />
                <Info label="Group" value={tag.conventionGroup} />
                <Info label="Status" value={status.biometricVerified ? 'Biometric Verified' : 'Registered'} />
              </div>
            </div>
          </div>
        </motion.div>

        <section id="timetable" className="mt-6 rounded-[28px] border border-portal-line bg-portal-surface p-5 text-portal-ink shadow-xl dark:border-white/10 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Convention Timetable</h2>
              <p className="mt-1 text-sm text-portal-label">Sessions and times for {status.event.name}.</p>
            </div>
            {status.programmes.length > 0 && (
              <Link to={`/convention/timetable/${status.workspaceSlug}?back=${token}`} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-portal-dark px-4 text-sm font-bold text-white">
                <Printer className="h-4 w-4" /> Print or download
              </Link>
            )}
          </div>
          <ConventionTimetable sessions={status.programmes} hideLocation={status.event.venue} />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-[28px] border border-portal-line bg-portal-surface p-5 text-portal-ink shadow-xl dark:border-white/10 sm:p-6">
            <h2 className="mb-5 text-xl font-black">Convention Status Timeline</h2>
            <div className="space-y-4">
              <TimelineItem complete title="Registration Completed" detail={formatDateTime(status.registeredAt)} icon={BadgeCheck} />
              <TimelineItem complete title="Convention Tag Generated" detail="Your official event pass is available below." icon={Ticket} />
              <TimelineItem complete={status.biometricVerified} title="Biometric Verification" detail={status.biometricVerified ? formatDateTime(status.lastVerifiedAt) : 'Fingerprint data is never shown here.'} icon={ShieldCheck} />
              <TimelineItem complete={Boolean(firstCheckIn)} title="Convention Attendance" detail={firstCheckIn ? `First check-in ${formatDateTime(firstCheckIn.checkedInAt)}` : 'Not checked in yet.'} icon={Check} />
              <TimelineItem complete={Boolean(claim('food'))} title="Food Collection" detail={formatDateTime(claim('food')) || 'Not collected yet.'} icon={Utensils} />
              <TimelineItem complete={Boolean(claim('souvenir'))} title="Souvenir Collection" detail={formatDateTime(claim('souvenir')) || 'Not collected yet.'} icon={Gift} />
              <TimelineItem complete={Boolean(claim('activity'))} title="Activity Participation" detail={formatDateTime(claim('activity')) || 'No activity participation recorded yet.'} icon={Trophy} />
            </div>

            <h3 className="mt-8 mb-4 text-lg font-black">Attendance log</h3>
            {status.attendance.length === 0 ? (
              <p className="text-sm text-portal-label">Your check-ins will appear here during the convention.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {status.attendance.map(entry => (
                  <div key={entry.checkedInAt} className="rounded-2xl border border-portal-line bg-portal-surface p-4 dark:border-white/10">
                    <p className="font-bold">{new Date(`${entry.date}T00:00:00`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                    <p className="mt-2 text-xs font-bold uppercase text-portal-label">{entry.programme ?? 'Daily check-in'} · {new Date(entry.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-portal-line bg-portal-surface p-5 shadow-xl dark:border-white/10">
            <h2 className="mb-4 text-xl font-black text-portal-ink dark:text-portal-ink">Official Tag</h2>
            {isMember ? <ConventionTag member={tag} eventName={status.event.name} /> : <ExecutiveConventionTag executive={tag} eventName={status.event.name} />}
            <div className="mt-4 space-y-2">
              <TagDownloadButton status={status} />
              <button onClick={() => window.print()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-portal-line px-5 py-3 text-sm font-bold text-portal-ink"><Printer className="h-4 w-4" /> Print Convention Tag</button>
            </div>
          </div>
        </div>
      </div>
    </AttendeePortalLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-portal-surface p-3 dark:bg-portal-surface">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-portal-label">{label}</p>
      <p className="mt-1 truncate text-sm font-bold">{value}</p>
    </div>
  );
}

/** Loads a status payload by token; loading is derived from which token the result belongs to. */
function useAttendeeStatus(token: string | undefined) {
  const [result, setResult] = useState<{ token?: string; status: AttendeeStatus | null }>({ status: null });
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getAttendeeStatus(token)
      .then(status => { if (!cancelled) setResult({ token, status }); })
      .catch(() => { if (!cancelled) setResult({ token, status: null }); });
    return () => { cancelled = true; };
  }, [token]);
  return { loading: Boolean(token) && result.token !== token, status: result.token === token ? result.status : null };
}

/** Target of the "Download my convention tag" button in the confirmation email. */
export function ConventionTagDownloadPage() {
  const { token } = useParams();
  const { loading, status } = useAttendeeStatus(token);
  const started = useRef(false);

  useEffect(() => {
    if (!status || started.current) return;
    started.current = true;
    void downloadTagImage(tagFromStatus(status), status.event.name, status.kind).catch(() => undefined);
  }, [status]);

  if (loading) {
    return <AttendeePortalLayout token={token} compact><div className="grid place-items-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-portal-line border-t-portal-accent" /></div></AttendeePortalLayout>;
  }
  if (!status || !token) {
    return (
      <AttendeePortalLayout compact>
        <div className="max-w-md rounded-[28px] border border-white/10 bg-portal-surface p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-300" />
          <h1 className="mt-5 text-2xl font-black">Tag not found</h1>
          <p className="mt-3 text-sm leading-6 text-portal-label">This link is invalid or the registration was removed.</p>
        </div>
      </AttendeePortalLayout>
    );
  }
  const tag = tagFromStatus(status);
  return (
    <AttendeePortalLayout token={token} compact>
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-black text-portal-ink">Your convention tag</h1>
        <p className="mt-2 text-sm text-portal-label">The download should start automatically. If it doesn't, use the button below.</p>
        <div className="mt-6">
          {status.kind === 'member' ? <ConventionTag member={tag} eventName={status.event.name} /> : <ExecutiveConventionTag executive={tag} eventName={status.event.name} />}
        </div>
        <div className="mt-5 space-y-2">
          <TagDownloadButton status={status} label="Download again" />
          <Link to={`/convention/status/${token}`} className="flex w-full items-center justify-center rounded-2xl border border-portal-line px-5 py-3 text-sm font-bold text-portal-ink">View my convention status</Link>
        </div>
      </div>
    </AttendeePortalLayout>
  );
}

export function ConventionStatusPortal() {
  const { token } = useParams();
  const { loading, status } = useAttendeeStatus(token);

  if (loading) {
    return <AttendeePortalLayout compact><div className="grid place-items-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-2 border-portal-line border-t-portal-accent" /></div></AttendeePortalLayout>;
  }

  if (!status || !token) {
    return (
      <AttendeePortalLayout compact>
        <div className="max-w-md rounded-[28px] border border-white/10 bg-portal-surface p-8 text-center backdrop-blur-xl">
          <XCircle className="mx-auto h-12 w-12 text-red-300" />
          <h1 className="mt-5 text-2xl font-black">Status Link Not Found</h1>
          <p className="mt-3 text-sm leading-6 text-portal-label">This convention status link is invalid or the registration was removed.</p>
          <Link to="/convention/status" className="mt-6 inline-flex rounded-2xl bg-portal-surface px-5 py-3 text-sm font-bold text-portal-ink">Search Status</Link>
        </div>
      </AttendeePortalLayout>
    );
  }

  return <AttendeePass status={status} token={token} />;
}

export function ConventionStatusSearchPage() {
  const [params, setParams] = useSearchParams();
  const [workspace, setWorkspace] = useState(params.get('w') ?? '');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Awaited<ReturnType<typeof findAttendeeStatus>> | null>(null);
  const [error, setError] = useState('');

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!workspace.trim() || query.trim().length < 4) {
      setError('Enter your fellowship code and your member ID or registered email.');
      return;
    }
    setSearching(true);
    try {
      setParams({ w: workspace.trim().toLowerCase() }, { replace: true });
      setResults(await findAttendeeStatus(workspace.trim(), query.trim()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <AttendeePortalLayout compact>
      <h1 className="text-4xl font-black tracking-tight">Check your convention status</h1>
      <p className="mt-3 text-portal-label dark:text-portal-label">Enter your fellowship code with your member/executive ID or the email you registered with. Your status link was also shown when you registered.</p>
      <form onSubmit={search} className="mt-8 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
        <input value={workspace} onChange={event => setWorkspace(event.target.value)} className="glass-input h-14 w-full rounded-2xl" placeholder="Fellowship code" aria-label="Fellowship code" />
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-portal-label" />
          <input value={query} onChange={event => setQuery(event.target.value)} className="glass-input h-14 w-full rounded-2xl pl-12" placeholder="Member ID or email" aria-label="Member ID or email" />
        </div>
        <button type="submit" disabled={searching} className="h-14 rounded-2xl bg-portal-dark px-6 text-sm font-bold text-white disabled:opacity-70">{searching ? 'Searching…' : 'Search'}</button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 space-y-3">
        {results && results.length === 0 && <p className="text-sm text-portal-label">No registration matches. Check the fellowship code and your ID or email.</p>}
        {results?.map(result => (
          <Link key={result.status_token} to={`/convention/status/${result.status_token}`} className="block rounded-2xl border border-portal-line bg-portal-surface p-4 shadow-sm transition hover:-translate-y-0.5 dark:border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-black">{result.full_name}</p>
                <p className="font-mono text-sm text-portal-ink">{result.code}</p>
              </div>
              <StatusPill complete label={result.kind === 'executive' ? 'Executive' : 'Registered'} />
            </div>
          </Link>
        ))}
      </div>
    </AttendeePortalLayout>
  );
}
