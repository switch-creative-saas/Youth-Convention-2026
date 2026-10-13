import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, AlertTriangle, CheckCircle, Cpu, Fingerprint, Radio, Search, ShieldCheck, Sparkles,
  Utensils, Gift, DoorOpen, Trophy, Plus, Trash2, UserCheck,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PortalInput } from '@/components/ui-kit/FormControls';
import { fetchEnrollments, enrollFingerprint, recordBiometricVerification, type EnrollmentRow } from '@/lib/api';
import { bestMatch, captureFingerprint, ENROLL_MIN_QUALITY, MATCH_THRESHOLD, SECUGEN_SERVICE_URL, SecuGenError } from '@/lib/secugen';
import { formatDateTime } from '@/lib/format';
import type { AccessItemType, Attendee, FingerprintFinger } from '@/types';

const ACCESS_ITEMS: Array<{ id: AccessItemType; label: string; icon: typeof Utensils }> = [
  { id: 'entry', label: 'Convention Entry', icon: DoorOpen },
  { id: 'food', label: 'Food Collection', icon: Utensils },
  { id: 'souvenir', label: 'Souvenir Collection', icon: Gift },
  { id: 'activity', label: 'Activity Participation', icon: Trophy },
];

const FINGERS: Array<{ id: FingerprintFinger; label: string }> = [
  { id: 'right_thumb', label: 'Right thumb' }, { id: 'right_index', label: 'Right index' }, { id: 'right_middle', label: 'Right middle' },
  { id: 'left_thumb', label: 'Left thumb' }, { id: 'left_index', label: 'Left index' }, { id: 'left_middle', label: 'Left middle' },
  { id: 'right_ring', label: 'Right ring' }, { id: 'right_little', label: 'Right little' }, { id: 'left_ring', label: 'Left ring' }, { id: 'left_little', label: 'Left little' },
];

const DEVICE_STORAGE_KEY = 'mosyf_scanner_device';

function statusMeta(status?: string) {
  if (status === 'verified_checked_in') return { label: 'Biometric Verified', badge: 'status-badge-green' };
  if (status === 'fingerprint_enrolled') return { label: 'Fingerprint Enrolled', badge: 'status-badge-blue' };
  if (status === 'duplicate_attempt') return { label: 'Duplicate Attempt Detected', badge: 'status-badge-red' };
  return { label: 'Pending Verification', badge: 'status-badge-amber' };
}

type ScanOutcome = { tone: 'success' | 'warning' | 'error'; message: string; score?: number } | null;
type ScannerState = { state: 'unknown' | 'ready' | 'error'; message: string };

function readStoredDevice() {
  try { return window.localStorage.getItem(DEVICE_STORAGE_KEY) ?? ''; } catch { return ''; }
}

export function AdminAttendance() {
  const {
    attendees, attendance, biometricLogs, biometricDevices, today,
    claimAccessItem, recordManualCheckIn, saveDevice, deleteDevice, reportDeviceStatus, refreshAttendee,
  } = useAppData();
  const { addToast } = useToast();
  const canVerify = usePermission('verify');
  const canRegister = usePermission('register');
  const canManage = usePermission('manage');
  const canClaimFood = usePermission('claim_food');
  const canClaimSouvenir = usePermission('claim_souvenir');
  const canRecordActivity = usePermission('record_activity');

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Enrolments are tagged with the attendee they were loaded for; loading is derived from that.
  const [enrollmentState, setEnrollmentState] = useState<{ attendeeId: string | null; rows: EnrollmentRow[] }>({ attendeeId: null, rows: [] });
  const [finger, setFinger] = useState<FingerprintFinger>('right_thumb');
  const [consent, setConsent] = useState(false);
  const [forceEnroll, setForceEnroll] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanner, setScanner] = useState<ScannerState>({ state: 'unknown', message: 'Scanner not tested yet' });
  const [deviceId, setDeviceId] = useState(readStoredDevice);
  const [lastSerial, setLastSerial] = useState<string | null>(null);
  const [newDeviceName, setNewDeviceName] = useState('');

  const selected = useMemo(() => attendees.find(item => item.id === selectedId) ?? null, [attendees, selectedId]);
  const enrollments = enrollmentState.attendeeId === selectedId ? enrollmentState.rows : [];
  const enrollmentsLoading = canVerify && selectedId !== null && enrollmentState.attendeeId !== selectedId;
  const setEnrollments = (attendeeId: string, rows: EnrollmentRow[]) => setEnrollmentState({ attendeeId, rows });
  const device = biometricDevices.find(item => item.id === deviceId && item.isActive) ?? null;
  const serviceUrl = device?.serviceUrl || SECUGEN_SERVICE_URL;

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];
    return attendees.filter(item =>
      item.fullName.toLowerCase().includes(query) || item.code.toLowerCase().includes(query) || item.phoneNumber.includes(query),
    ).slice(0, 8);
  }, [attendees, search]);

  const pending = attendees.filter(item => item.biometricStatus !== 'verified_checked_in').length;
  const verified = attendees.filter(item => item.biometricStatus === 'verified_checked_in').length;
  const duplicates = biometricLogs.filter(log => log.status === 'duplicate').length;
  const recentVerified = attendance.filter(record => record.verificationMethod === 'biometric').slice(0, 8);
  const checkedInToday = selected ? attendance.some(record => record.attendeeId === selected.id && record.attendanceDate === today) : false;

  useEffect(() => {
    if (!selectedId || !canVerify) return;
    let cancelled = false;
    fetchEnrollments(selectedId)
      .then(rows => { if (!cancelled) setEnrollmentState({ attendeeId: selectedId, rows }); })
      .catch(error => {
        if (cancelled) return;
        setEnrollmentState({ attendeeId: selectedId, rows: [] });
        addToast({ type: 'error', title: 'Could not load fingerprints', description: error instanceof Error ? error.message : undefined });
      });
    return () => { cancelled = true; };
  }, [selectedId, canVerify, addToast]);

  const selectAttendee = (attendee: Attendee) => {
    setSelectedId(attendee.id);
    setSearch(attendee.fullName);
    setOutcome(null);
    setPreview(null);
    setConsent(Boolean(attendee.biometricConsentAt));
    setForceEnroll(false);
  };

  const chooseDevice = (id: string) => {
    setDeviceId(id);
    try { window.localStorage.setItem(DEVICE_STORAGE_KEY, id); } catch { /* per-PC convenience */ }
  };

  /** Captures one fingerprint and keeps scanner/device status in sync. */
  const capture = async () => {
    try {
      const result = await captureFingerprint(serviceUrl);
      setScanner({ state: 'ready', message: `${result.model ?? 'SecuGen scanner'} ready${result.serialNumber ? ` · ${result.serialNumber}` : ''}` });
      setLastSerial(result.serialNumber);
      setPreview(result.bmpBase64 ? `data:image/bmp;base64,${result.bmpBase64}` : null);
      if (device) void reportDeviceStatus(device.id, 'online').catch(() => undefined);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scanner error';
      setScanner({ state: 'error', message });
      if (device && error instanceof SecuGenError && error.code === null) void reportDeviceStatus(device.id, 'offline').catch(() => undefined);
      throw error;
    }
  };

  const testScanner = async () => {
    setScanning(true);
    try {
      await capture();
      addToast({ type: 'success', title: 'Scanner is working' });
    } catch (error) {
      addToast({ type: 'error', title: 'Scanner test failed', description: error instanceof Error ? error.message : undefined, duration: 8000 });
    } finally {
      setScanning(false);
    }
  };

  const runEnrollment = async () => {
    if (!selected) return;
    if (!consent) {
      addToast({ type: 'warning', title: 'Confirm the attendee has consented to fingerprint capture.' });
      return;
    }
    setScanning(true);
    setOutcome(null);
    try {
      const result = await capture();
      if (result.imageQuality < ENROLL_MIN_QUALITY) {
        setOutcome({ tone: 'warning', message: `Image quality ${result.imageQuality} is too low (minimum ${ENROLL_MIN_QUALITY}). Clean the sensor and try again.` });
        return;
      }
      await enrollFingerprint({
        attendeeId: selected.id, finger, template: result.template, imageQuality: result.imageQuality,
        nfiq: result.nfiq ?? undefined, deviceId: device?.id, consent: true,
      });
      setEnrollments(selected.id, await fetchEnrollments(selected.id));
      void refreshAttendee(selected.id).catch(() => undefined);
      setForceEnroll(false);
      setOutcome({ tone: 'success', message: `${FINGERS.find(item => item.id === finger)?.label} enrolled (quality ${result.imageQuality}). Now capture again to verify and check in.` });
    } catch (error) {
      setOutcome({ tone: 'error', message: error instanceof Error ? error.message : 'Enrolment failed' });
    } finally {
      setScanning(false);
    }
  };

  const runVerification = async () => {
    if (!selected || enrollments.length === 0) return;
    setScanning(true);
    setOutcome(null);
    try {
      let captured;
      try {
        captured = await capture();
      } catch (error) {
        await recordBiometricVerification({ attendeeId: selected.id, result: 'device_error', deviceId: device?.id, message: error instanceof Error ? error.message : 'Scanner error' }).catch(() => undefined);
        throw error;
      }
      const best = await bestMatch(captured.template, enrollments, serviceUrl);
      if (!best || best.score < MATCH_THRESHOLD) {
        await recordBiometricVerification({ attendeeId: selected.id, result: 'no_match', matchScore: best?.score, threshold: MATCH_THRESHOLD, enrollmentId: best?.enrollmentId, deviceId: device?.id, message: 'Fingerprint did not match' });
        setOutcome({ tone: 'error', message: 'Fingerprint did not match this attendee. Try again or use a different enrolled finger.', score: best?.score });
        return;
      }
      const result = await recordBiometricVerification({ attendeeId: selected.id, result: 'success', matchScore: best.score, threshold: MATCH_THRESHOLD, enrollmentId: best.enrollmentId, deviceId: device?.id });
      setOutcome({ tone: result.ok ? 'success' : 'warning', message: result.message, score: best.score });
      void refreshAttendee(selected.id).catch(() => undefined);
    } catch (error) {
      setOutcome({ tone: 'error', message: error instanceof Error ? error.message : 'Verification failed' });
    } finally {
      setScanning(false);
    }
  };

  const manualCheckIn = async () => {
    if (!selected) return;
    try {
      await recordManualCheckIn(selected.id, 'manual');
      addToast({ type: 'success', title: `${selected.fullName} checked in manually` });
    } catch (error) {
      addToast({ type: 'warning', title: error instanceof Error ? error.message : 'Check-in failed' });
    }
  };

  const allowedFor = (item: AccessItemType) => item === 'food' ? canClaimFood : item === 'souvenir' ? canClaimSouvenir : item === 'activity' ? canRecordActivity : canVerify;

  const handleAccessClaim = async (item: AccessItemType) => {
    if (!selected) return;
    try {
      const result = await claimAccessItem(selected.id, item);
      addToast({ type: result.ok ? 'success' : 'warning', title: result.message });
    } catch (error) {
      addToast({ type: 'error', title: error instanceof Error ? error.message : 'Could not record access' });
    }
  };

  const registerDevice = async () => {
    if (!newDeviceName.trim()) return;
    try {
      await saveDevice({ name: newDeviceName, serialNumber: lastSerial, serviceUrl: SECUGEN_SERVICE_URL });
      setNewDeviceName('');
      addToast({ type: 'success', title: 'Scanner registered' });
    } catch (error) {
      addToast({ type: 'error', title: 'Could not register scanner', description: error instanceof Error ? error.message : undefined });
    }
  };

  const showEnroll = canVerify && !enrollmentsLoading && (enrollments.length === 0 || forceEnroll);

  return (
    <AdminLayout pageTitle="Biometric Operations Control" pageSubtitle="SecuGen Hamster Pro 20 fingerprint enrolment, verification, check-in and access control.">
      <div className="mb-6 flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
        {biometricDevices.length > 0 && (
          <select aria-label="Scanner on this PC" value={device?.id ?? ''} onChange={event => chooseDevice(event.target.value)} className="portal-focus min-h-11 rounded-2xl border border-portal-line bg-portal-surface px-3 text-sm text-portal-ink">
            <option value="">Unregistered scanner (this PC)</option>
            {biometricDevices.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        )}
        <div className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 ${scanner.state === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-600' : 'border-portal-line bg-portal-surface text-portal-ink'}`}>
          <Radio className={`w-4 h-4 ${scanner.state === 'ready' ? 'animate-pulse' : ''}`} />
          <span className="max-w-[420px] truncate text-sm font-medium" title={scanner.message}>{scanner.message}</span>
        </div>
        {canVerify && <button onClick={() => void testScanner()} disabled={scanning} className="min-h-11 rounded-full border border-portal-line px-4 text-sm font-medium text-portal-ink disabled:opacity-60">Test scanner</button>}
      </div>

      <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Not Yet Verified', value: pending, icon: Fingerprint, tone: 'text-amber-500 bg-amber-500/10' },
          { label: 'Biometric Verified', value: verified, icon: ShieldCheck, tone: 'text-portal-ink bg-portal-surface' },
          { label: 'Duplicate Alerts', value: duplicates, icon: AlertTriangle, tone: 'text-red-500 bg-red-500/10' },
          { label: 'Registered Scanners', value: biometricDevices.length, icon: Cpu, tone: 'text-portal-ink bg-portal-surface' },
        ].map((item, index) => (
          <motion.div key={item.label} className="rounded-[20px] p-5 backdrop-blur-glass border bg-white/70 dark:bg-portal-surface border-white/45 dark:border-white/[0.08]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.tone}`}><item.icon className="w-5 h-5" /></div>
            <p className="font-mono text-3xl font-bold text-portal-ink dark:text-white mt-4">{item.value}</p>
            <p className="text-xs text-portal-label mt-1">{item.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
        <motion.div className="portal-card min-w-0 p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-5">
            <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white">Attendee Lookup</h3>
            <p className="text-xs text-portal-label mt-1">Search by name, member/executive ID or phone. A QR scanner that types the ID works here too.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-portal-label" />
            <PortalInput
              value={search}
              onChange={e => { setSearch(e.target.value); if (e.target.value.length < 2) setSelectedId(null); }}
              onKeyDown={e => { if (e.key === 'Enter' && searchResults.length === 1) selectAttendee(searchResults[0]); }}
              placeholder="Search attendee or scan QR code..."
              className="pl-12"
            />
            {search.length > 1 && !selected && (
              <div className="absolute top-full left-0 right-0 z-20 mt-2 rounded-2xl border bg-white dark:bg-portal-surface border-portal-line dark:border-white/10 shadow-xl overflow-hidden">
                {searchResults.length === 0 ? <p className="p-4 text-sm text-portal-label text-center">No attendee found</p> : searchResults.map(item => (
                  <button key={item.id} onClick={() => selectAttendee(item)} className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-portal-surface dark:hover:bg-white/5">
                    <div>
                      <p className="text-sm font-semibold text-portal-ink dark:text-white">{item.fullName}</p>
                      <p className="text-xs text-portal-label font-mono">{item.code} - {item.conventionGroup}</p>
                    </div>
                    <span className={`${statusMeta(item.biometricStatus).badge} text-[10px]`}>{statusMeta(item.biometricStatus).label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id} className="mt-6 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="rounded-[22px] p-6 bg-portal-dark text-white overflow-hidden relative">
                  <div className="relative z-10 text-center">
                    <div className="w-32 h-32 rounded-full mx-auto bg-portal-surface border border-portal-line flex items-center justify-center overflow-hidden">
                      {preview ? <img src={preview} alt="Last captured fingerprint" className="h-full w-full object-cover" /> : <Fingerprint className={`w-16 h-16 text-portal-ink ${scanning ? 'animate-pulse' : ''}`} />}
                    </div>
                    <p className="mt-5 text-sm text-white">{scanning ? 'Place finger on the scanner…' : 'Ready for fingerprint capture'}</p>
                    <p className="text-xs text-white/55 mt-2">{device?.name ?? 'SecuGen scanner on this PC'}</p>
                    {selected.profilePhoto && <img src={selected.profilePhoto} alt={selected.fullName} className="mx-auto mt-5 h-24 w-20 rounded-xl object-cover" />}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h3 className="font-display font-bold text-xl text-portal-ink dark:text-white">{selected.fullName}</h3>
                      <p className="font-mono text-sm text-portal-ink mt-1">{selected.code}</p>
                    </div>
                    <span className={statusMeta(selected.biometricStatus).badge}>{statusMeta(selected.biometricStatus).label}</span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      { label: selected.kind === 'member' ? 'Fellowship Band' : 'Leadership Role', value: selected.kind === 'member' ? selected.fellowshipBand : selected.leadershipRole },
                      { label: 'Department(s)', value: selected.departments.join(', ') || '—' },
                      { label: 'Convention Group', value: selected.conventionGroup },
                      { label: 'Today', value: checkedInToday ? 'Checked in' : 'Not checked in' },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-[10px] uppercase tracking-wider text-portal-label">{item.label}</p>
                        <p className="text-sm font-medium text-portal-ink dark:text-portal-label mt-1">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {canVerify && enrollmentsLoading && <p className="mt-6 text-sm text-portal-label">Loading fingerprint enrolment…</p>}

                  {showEnroll && (
                    <div className="mt-6 rounded-2xl border border-portal-line p-4">
                      <p className="text-sm font-semibold text-portal-ink">{enrollments.length ? 'Enrol another finger' : 'No fingerprint enrolled yet'}</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <select value={finger} onChange={event => setFinger(event.target.value as FingerprintFinger)} className="portal-focus min-h-11 rounded-2xl border border-portal-line bg-portal-surface px-3 text-sm text-portal-ink">
                          {FINGERS.map(item => <option key={item.id} value={item.id}>{item.label}{enrollments.some(row => row.finger === item.id) ? ' (re-enrol)' : ''}</option>)}
                        </select>
                        <label className="flex items-start gap-2 text-xs text-portal-label">
                          <input type="checkbox" checked={consent} disabled={Boolean(selected.biometricConsentAt)} onChange={event => setConsent(event.target.checked)} className="mt-0.5" />
                          {selected.biometricConsentAt ? `Consent recorded ${formatDateTime(selected.biometricConsentAt)}` : 'Attendee consents to fingerprint capture for convention check-in (deleted after the event).'}
                        </label>
                      </div>
                      <button onClick={() => void runEnrollment()} disabled={scanning} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-portal-dark text-white disabled:opacity-70">
                        {scanning ? <Activity className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                        {scanning ? 'Capturing…' : 'Capture and Enrol Fingerprint'}
                      </button>
                      {forceEnroll && <button onClick={() => setForceEnroll(false)} className="mt-2 w-full text-xs text-portal-label underline">Cancel</button>}
                    </div>
                  )}

                  {canVerify && !enrollmentsLoading && enrollments.length > 0 && !forceEnroll && (
                    <>
                      <button onClick={() => void runVerification()} disabled={scanning} className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-portal-dark text-white disabled:opacity-70">
                        {scanning ? <Activity className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                        {scanning ? 'Scanning Fingerprint' : 'Capture and Verify Fingerprint'}
                      </button>
                      <p className="mt-2 text-center text-xs text-portal-label">
                        {enrollments.length} finger{enrollments.length === 1 ? '' : 's'} enrolled · match threshold {MATCH_THRESHOLD}/199 ·{' '}
                        <button className="underline" onClick={() => setForceEnroll(true)}>enrol another finger</button>
                      </p>
                    </>
                  )}

                  {(canVerify || canRegister) && !checkedInToday && (
                    <button onClick={() => void manualCheckIn()} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-portal-line text-sm font-medium text-portal-ink">
                      <UserCheck className="h-4 w-4" /> Manual check-in (no fingerprint)
                    </button>
                  )}

                  {outcome && (
                    <motion.div className={`mt-4 p-4 rounded-2xl border ${outcome.tone === 'success' ? 'bg-portal-surface border-portal-line text-portal-ink' : outcome.tone === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-700' : 'bg-red-500/10 border-red-500/20 text-red-600'}`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {outcome.tone === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        {outcome.message}
                      </div>
                      {outcome.score !== undefined && <p className="mt-1 text-xs opacity-80">Match score {outcome.score}/199</p>}
                    </motion.div>
                  )}

                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-portal-ink dark:text-white mb-3">Access Control</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ACCESS_ITEMS.map(item => {
                        const claimed = selected.accessClaims[item.id];
                        const Icon = item.icon;
                        return (
                          <button key={item.id} onClick={() => void handleAccessClaim(item.id)} disabled={!allowedFor(item.id) || Boolean(claimed)} className="p-3 rounded-2xl border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 bg-portal-surface border-portal-line text-portal-ink hover:bg-portal-surface">
                            <Icon className="w-4 h-4 mb-2" />
                            <p className="text-sm font-medium">{claimed ? `${item.label} — Claimed` : item.label}</p>
                            <p className="text-[11px] opacity-70 mt-1">{claimed ? formatDateTime(claimed) : 'Requires biometric verification'}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div className="mt-6 rounded-[22px] border border-dashed border-portal-line p-7 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Sparkles className="w-10 h-10 text-portal-ink mx-auto mb-3" />
                <p className="text-sm text-portal-label">{attendees.length ? 'Search or scan a QR code to load attendee details.' : 'No attendees have registered yet.'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="min-w-0 space-y-6">
          <motion.div className="portal-card p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Scanners</h3>
            <div className="space-y-3">
              {biometricDevices.length === 0 && <p className="text-sm text-portal-label">No scanners registered. Check-in still works with the scanner plugged into this PC; register it to track which desk captured each scan.</p>}
              {biometricDevices.map(item => (
                <div key={item.id} className="p-4 rounded-2xl bg-portal-surface border border-portal-line">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-portal-ink dark:text-white">{item.name}</p>
                      <p className="text-xs text-portal-label mt-1">{item.vendor} {item.model}{item.serialNumber ? ` · ${item.serialNumber}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.04em] ${item.status === 'online' ? 'border-green-500/30 text-green-600' : 'border-portal-line text-portal-label'}`}>{item.status}</span>
                      {canManage && <button aria-label={`Remove ${item.name}`} onClick={() => void deleteDevice(item.id)} className="p-1.5 text-red-400"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </div>
                  <p className="text-[11px] text-portal-label mt-3">{item.lastHeartbeat ? `Last capture ${formatDateTime(item.lastHeartbeat)}` : 'No captures yet'}</p>
                </div>
              ))}
            </div>
            {canManage && (
              <div className="mt-4 flex gap-2">
                <PortalInput value={newDeviceName} onChange={event => setNewDeviceName(event.target.value)} placeholder={lastSerial ? `Name for scanner ${lastSerial}` : 'Scanner name (e.g. Desk 1)'} />
                <button onClick={() => void registerDevice()} aria-label="Register scanner" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-portal-line text-portal-ink"><Plus className="h-4 w-4" /></button>
              </div>
            )}
          </motion.div>

          <motion.div className="portal-card p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Verification Feed</h3>
            <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-thin">
              {biometricLogs.length === 0 && <p className="text-sm text-portal-label">Waiting for scanner activity.</p>}
              {biometricLogs.slice(0, 15).map(log => (
                <div key={log.id} className="flex items-start gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${log.status === 'success' ? 'bg-portal-dark' : log.status === 'duplicate' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-portal-ink dark:text-portal-label">{log.attendeeName ?? 'Unknown attendee'} · {log.kind}</p>
                    <p className="text-xs text-portal-label mt-1">{log.message || log.status}{log.matchScore !== null ? ` (score ${log.matchScore})` : ''} - {new Date(log.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className="portal-card p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Recently Verified</h3>
            <div className="space-y-3">
              {recentVerified.length === 0 && <p className="text-sm text-portal-label">No biometric check-ins yet.</p>}
              {recentVerified.map(record => (
                <div key={record.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-portal-ink dark:text-white">{record.attendeeName}</p>
                    <p className="text-xs font-mono text-portal-label">{record.attendeeCode}</p>
                  </div>
                  <span className="text-xs text-portal-ink">{new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
