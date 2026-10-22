import { useCallback, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Gift, Maximize, Minimize, ScanLine, Search, Trophy, UserCheck, Utensils, Volume2, VolumeX, XCircle, AlertTriangle } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { QrScanner } from '@/components/QrScanner';
import { useAppData } from '@/contexts/AppDataContext';
import { usePermission } from '@/hooks/usePermission';
import { formatDateTime, initials } from '@/lib/format';
import { isMediaTeam } from '@/lib/tagImage';
import type { AccessItemType, Attendee } from '@/types';

type Mode = 'checkin' | 'food' | 'souvenir' | 'activity';
type Outcome = 'success' | 'warning' | 'error';

interface ScanResult {
  id: number;
  attendee: Attendee | null;
  mode: Mode;
  outcome: Outcome;
  title: string;
  detail?: string;
  at: string;
}

const MODES: Record<Mode, { label: string; icon: typeof UserCheck; item?: AccessItemType }> = {
  checkin: { label: 'Check-in', icon: UserCheck },
  food: { label: 'Food', icon: Utensils, item: 'food' },
  souvenir: { label: 'Souvenir', icon: Gift, item: 'souvenir' },
  activity: { label: 'Activity', icon: Trophy, item: 'activity' },
};

const OUTCOME_STYLE: Record<Outcome, { panel: string; icon: typeof CheckCircle2 }> = {
  success: { panel: 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', icon: CheckCircle2 },
  warning: { panel: 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300', icon: AlertTriangle },
  error: { panel: 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300', icon: XCircle },
};

const SAME_CODE_COOLDOWN_MS = 5000;

/** Short beep plus vibration so the operator knows the result without looking. */
function feedback(outcome: Outcome, sound: boolean) {
  try { navigator.vibrate?.(outcome === 'success' ? 120 : [80, 60, 80]); } catch { /* not supported */ }
  if (!sound) return;
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = outcome === 'success' ? 880 : outcome === 'warning' ? 520 : 260;
    gain.gain.setValueAtTime(0.18, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.25);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.26);
    oscillator.onended = () => void audio.close();
  } catch {
    // Sound is optional.
  }
}

/** Status token from a status-page link, or the attendee code printed in tag QR codes. */
function parseScan(text: string) {
  const token = text.match(/convention\/status\/([a-f0-9]{32,64})/i)?.[1];
  return token ? { token } : { code: text.trim().toUpperCase() };
}

/**
 * Tablet scanning station: reads the QR code on a tag with the camera and records check-in, food,
 * souvenir or activity for that person (what the fingerprint scanner was meant to do).
 */
export function AdminScan() {
  const { attendees, attendance, programmes, today, currentEvent, qrCheckIn, claimAccessItem } = useAppData();
  const canRegister = usePermission('register');
  const canVerify = usePermission('verify');
  const allowed: Record<Mode, boolean> = {
    checkin: canRegister || canVerify,
    food: usePermission('claim_food'),
    souvenir: usePermission('claim_souvenir'),
    activity: usePermission('record_activity'),
  };
  const modes = (Object.keys(MODES) as Mode[]).filter(mode => allowed[mode]);
  const [mode, setMode] = useState<Mode>(modes[0] ?? 'checkin');
  const [sessionId, setSessionId] = useState('');
  const [sound, setSound] = useState(true);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [query, setQuery] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const lastScan = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const nextId = useRef(1);

  const byCode = useMemo(() => new Map(attendees.map(attendee => [attendee.code.toUpperCase(), attendee])), [attendees]);
  const byToken = useMemo(() => new Map(attendees.map(attendee => [attendee.statusToken, attendee])), [attendees]);
  const todaysSessions = useMemo(() => programmes.filter(session => session.active && session.date === today), [programmes, today]);
  const checkedInToday = useMemo(() => new Set(attendance.filter(row => row.attendanceDate === today).map(row => row.attendeeId)), [attendance, today]);
  const counts = useMemo(() => ({
    checkin: checkedInToday.size,
    food: attendees.filter(attendee => attendee.accessClaims.food).length,
    souvenir: attendees.filter(attendee => attendee.accessClaims.souvenir).length,
    activity: attendees.filter(attendee => attendee.accessClaims.activity).length,
  }), [attendees, checkedInToday]);

  const record = useCallback((result: Omit<ScanResult, 'id' | 'at'>) => {
    feedback(result.outcome, sound);
    setResults(previous => [{ ...result, id: nextId.current++, at: new Date().toISOString() }, ...previous].slice(0, 30));
  }, [sound]);

  const process = useCallback(async (attendee: Attendee | null, scanned?: string, actionMode: Mode = mode) => {
    const mode = actionMode;
    if (!attendee) {
      record({ attendee: null, mode, outcome: 'error', title: 'Tag not recognised', detail: scanned ? `"${scanned}" is not registered for this convention.` : undefined });
      return;
    }
    setBusy(true);
    try {
      if (mode === 'checkin') {
        const result = await qrCheckIn(attendee.id, sessionId || null);
        record(result.ok
          ? { attendee, mode, outcome: 'success', title: 'Checked in', detail: sessionId ? todaysSessions.find(session => session.id === sessionId)?.title : 'Daily check-in' }
          : { attendee, mode, outcome: 'warning', title: 'Already checked in', detail: result.checkedInAt ? `at ${formatDateTime(result.checkedInAt)}` : undefined });
      } else {
        const item = MODES[mode].item!;
        const result = await claimAccessItem(attendee.id, item);
        const already = /already/i.test(result.message);
        record({
          attendee, mode,
          outcome: result.ok ? 'success' : already ? 'warning' : 'error',
          title: result.ok ? `${MODES[mode].label} given` : result.message,
          detail: already && attendee.accessClaims[item] ? `at ${formatDateTime(attendee.accessClaims[item])}` : undefined,
        });
      }
    } catch (error) {
      record({ attendee, mode, outcome: 'error', title: 'Could not record', detail: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(false);
    }
  }, [mode, sessionId, todaysSessions, qrCheckIn, claimAccessItem, record]);

  const onScan = useCallback((text: string) => {
    const now = Date.now();
    if (busy || (text === lastScan.current.text && now - lastScan.current.at < SAME_CODE_COOLDOWN_MS)) return;
    lastScan.current = { text, at: now };
    const parsed = parseScan(text);
    const attendee = parsed.token ? byToken.get(parsed.token) ?? null : byCode.get(parsed.code!) ?? null;
    void process(attendee, text);
  }, [busy, byCode, byToken, process]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    return attendees.filter(attendee => attendee.code.toLowerCase().includes(term) || attendee.fullName.toLowerCase().includes(term)).slice(0, 6);
  }, [attendees, query]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setFullscreen(Boolean(document.fullscreenElement));
    } catch {
      setFullscreen(false);
    }
  };

  const latest = results[0];
  const latestAttendee = latest?.attendee ? attendees.find(item => item.id === latest.attendee!.id) ?? latest.attendee : null;

  if (modes.length === 0) {
    return (
      <AdminLayout pageTitle="Scan Tags" pageSubtitle="Scan the QR code on a tag to check people in and give out items.">
        <p className="portal-card p-6 text-sm text-portal-label">Your role does not include check-in, food, souvenir or activity scanning. Ask an admin for access.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Scan Tags" pageSubtitle={`Point the camera at the QR code on a tag. ${currentEvent?.name ?? ''}`}>
      {/* Mode picker */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {modes.map(item => {
          const Icon = MODES[item].icon;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              aria-pressed={mode === item}
              className={`inline-flex min-h-14 items-center gap-2 rounded-2xl px-5 text-base font-bold ${mode === item ? 'bg-portal-dark text-white' : 'border border-portal-line bg-portal-surface text-portal-ink'}`}
            >
              <Icon className="h-5 w-5" /> {MODES[item].label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${mode === item ? 'bg-white/20' : 'bg-portal-line/60'}`}>{counts[item]}</span>
            </button>
          );
        })}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => setSound(value => !value)} aria-label={sound ? 'Turn sound off' : 'Turn sound on'} className="grid h-14 w-14 place-items-center rounded-2xl border border-portal-line text-portal-ink">
            {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} className="grid h-14 w-14 place-items-center rounded-2xl border border-portal-line text-portal-ink">
            {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mode === 'checkin' && todaysSessions.length > 0 && (
        <label className="mb-4 flex flex-wrap items-center gap-3 text-sm text-portal-label">
          Recording for
          <select value={sessionId} onChange={event => setSessionId(event.target.value)} className="portal-focus min-h-11 rounded-full border border-portal-line bg-portal-surface px-4 text-sm font-medium text-portal-ink">
            <option value="">Daily check-in (once a day)</option>
            {todaysSessions.map(session => <option key={session.id} value={session.id}>{session.startTime} · {session.title}</option>)}
          </select>
        </label>
      )}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Camera and manual lookup */}
        <div className="min-w-0">
          <QrScanner onScan={onScan} paused={busy} />
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-portal-label" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="No QR? Type their ID or name"
              className="portal-focus h-14 w-full rounded-2xl border border-portal-line bg-portal-surface pl-12 pr-4 text-base text-portal-ink"
            />
            {matches.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-portal-line bg-white shadow-xl dark:bg-portal-surface">
                {matches.map(attendee => (
                  <li key={attendee.id}>
                    <button
                      type="button"
                      onClick={() => { setQuery(''); void process(attendee); }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-portal-surface"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-portal-ink">{attendee.fullName}</span>
                      <span className="shrink-0 font-mono text-xs text-portal-label">{attendee.code}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Result */}
        <div className="min-w-0 space-y-4">
          {!latest ? (
            <div className="portal-card grid min-h-[280px] place-items-center p-6 text-center">
              <div>
                <ScanLine className="mx-auto h-12 w-12 text-portal-label" />
                <p className="mt-3 text-lg font-bold text-portal-ink">Ready to scan</p>
                <p className="mt-1 text-sm text-portal-label">Mode: {MODES[mode].label}. Hold the tag's QR code inside the frame.</p>
              </div>
            </div>
          ) : (
            <div className={`rounded-[28px] border-4 p-5 ${OUTCOME_STYLE[latest.outcome].panel}`}>
              <div className="flex items-center gap-3">
                {(() => { const Icon = OUTCOME_STYLE[latest.outcome].icon; return <Icon className="h-10 w-10 shrink-0" />; })()}
                <div className="min-w-0">
                  <p className="text-2xl font-black leading-tight">{latest.title}</p>
                  {latest.detail && <p className="mt-0.5 text-sm font-medium opacity-90">{latest.detail}</p>}
                </div>
              </div>
              {latestAttendee && (
                <div className="mt-4 flex gap-4 rounded-2xl bg-white/80 p-4 text-portal-ink dark:bg-black/30 dark:text-white">
                  <div className="h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-portal-surface">
                    {latestAttendee.profilePhoto
                      ? <img src={latestAttendee.profilePhoto} alt={latestAttendee.fullName} className="h-full w-full object-cover" />
                      : <div className="grid h-full w-full place-items-center text-2xl font-black">{initials(latestAttendee.fullName)}</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xl font-black">{latestAttendee.fullName}</p>
                    <p className="font-mono text-sm opacity-80">{latestAttendee.code}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className={`${latestAttendee.kind === 'executive' ? 'status-badge-purple' : 'status-badge-blue'} text-[10px]`}>{latestAttendee.kind === 'executive' ? latestAttendee.leadershipRole || 'Executive' : 'Member'}</span>
                      {isMediaTeam(latestAttendee.departments) && <span className="status-badge-amber text-[10px]">Media team</span>}
                    </div>
                    <p className="mt-1.5 text-xs opacity-80">{[latestAttendee.conventionGroup, latestAttendee.fellowshipBand, latestAttendee.departments.join(', ')].filter(value => value && value !== 'None' && value !== 'Unassigned').join(' · ')}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                      <span className={checkedInToday.has(latestAttendee.id) ? 'status-badge-green' : 'status-badge-amber'}>{checkedInToday.has(latestAttendee.id) ? 'Checked in today' : 'Not checked in today'}</span>
                      <span className={latestAttendee.accessClaims.food ? 'status-badge-green' : 'status-badge-amber'}>Food {latestAttendee.accessClaims.food ? '✓' : '—'}</span>
                      <span className={latestAttendee.accessClaims.souvenir ? 'status-badge-green' : 'status-badge-amber'}>Souvenir {latestAttendee.accessClaims.souvenir ? '✓' : '—'}</span>
                    </div>
                  </div>
                </div>
              )}
              {latestAttendee && modes.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {modes.filter(item => item !== latest.mode).map(item => {
                    const Icon = MODES[item].icon;
                    return (
                      <button
                        key={item}
                        type="button"
                        disabled={busy}
                        onClick={() => void process(latestAttendee, undefined, item)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-portal-ink shadow-sm disabled:opacity-60 dark:bg-black/40 dark:text-white"
                      >
                        <Icon className="h-4 w-4" /> {item === 'checkin' ? 'Check in' : `Give ${MODES[item].label.toLowerCase()}`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="portal-card p-4">
            <h3 className="mb-2 text-sm font-bold text-portal-ink">Recent scans</h3>
            {results.length === 0 ? (
              <p className="text-sm text-portal-label">Scans on this tablet will appear here.</p>
            ) : (
              <ul className="max-h-[320px] divide-y divide-portal-line overflow-y-auto">
                {results.map(item => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-portal-ink">
                      <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${item.outcome === 'success' ? 'bg-emerald-500' : item.outcome === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      {item.attendee?.fullName ?? 'Unknown tag'} · {item.title}
                    </span>
                    <span className="shrink-0 text-xs text-portal-label">{MODES[item.mode].label} · {new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
