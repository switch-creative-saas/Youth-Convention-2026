import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Fingerprint,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Utensils,
  Gift,
  DoorOpen,
  Trophy,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { AccessItemType, Member } from '@/types';
import { PortalInput } from '@/components/ui-kit/FormControls';
import { usePermission } from '@/hooks/usePermission';

const ACCESS_ITEMS: Array<{ id: AccessItemType; label: string; icon: typeof Utensils }> = [
  { id: 'entry', label: 'Convention Entry', icon: DoorOpen },
  { id: 'food', label: 'Food Collection', icon: Utensils },
  { id: 'souvenir', label: 'Souvenir Collection', icon: Gift },
  { id: 'activity', label: 'Activity Participation', icon: Trophy },
];

function statusMeta(status?: string) {
  if (status === 'verified_checked_in') return { label: 'Biometric Verified', badge: 'status-badge-green' };
  if (status === 'fingerprint_enrolled') return { label: 'Fingerprint Enrolled', badge: 'status-badge-blue' };
  if (status === 'duplicate_attempt') return { label: 'Duplicate Attempt Detected', badge: 'status-badge-red' };
  return { label: 'Pending Verification', badge: 'status-badge-amber' };
}

export function AdminAttendance() {
  const {
    members,
    attendance,
    biometricLogs,
    biometricDevices,
    verifyMemberBiometric,
    claimAccessItem,
  } = useAppData();
  const { user } = useAuth();
  const { addToast } = useToast();
  const canVerify = usePermission('verify');
  const canClaimFood = usePermission('claim_food');
  const canClaimSouvenir = usePermission('claim_souvenir');
  const canRecordActivity = usePermission('record_activity');
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'duplicate' | null>(null);

  const actorEmail = user?.email ?? 'admin@mosyf.org';
  const actorName = user?.name ?? 'Admin';
  const onlineDevice = biometricDevices.find(device => device.status === 'online');

  const searchResults = search.length > 1
    ? members.filter(m =>
        m.fullName.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase()) ||
        m.qrCode.toLowerCase().includes(search.toLowerCase()) ||
        m.phoneNumber.includes(search)
      ).slice(0, 8)
    : [];

  const pendingMembers = members.filter(member => !member.biometricStatus || member.biometricStatus === 'pending_verification');
  const verifiedMembers = members.filter(member => member.biometricStatus === 'verified_checked_in');
  const duplicates = biometricLogs.filter(log => log.status === 'duplicate');
  const recentVerified = attendance.filter(record => record.verificationMethod === 'biometric').slice(0, 8);

  const scannerPulse = useMemo(() => ({
    scale: scanning ? [1, 1.08, 1] : 1,
    boxShadow: scanning
      ? ['0 0 0 rgba(138,138,133,0)', '0 0 36px rgba(138,138,133,0.55)', '0 0 0 rgba(138,138,133,0)']
      : '0 18px 50px rgba(138,138,133,0.2)',
  }), [scanning]);

  const selectMember = (member: Member) => {
    setSelectedMember(member);
    setSearch(member.fullName);
    setScanResult(null);
  };

  const runBiometricScan = async () => {
    if (!canVerify) {
      addToast({ type: 'warning', title: 'You do not have verification permission.' });
      return;
    }
    if (!selectedMember) return;
    if (!onlineDevice) {
      addToast({ type: 'error', title: 'No biometric scanner is online' });
      return;
    }

    setScanning(true);
    setScanResult(null);
    await new Promise(resolve => setTimeout(resolve, 1800));
    const result = verifyMemberBiometric(selectedMember.id, actorEmail, actorName);
    setScanning(false);
    setScanResult(result.duplicate ? 'duplicate' : result.ok ? 'success' : null);

    const latest = members.find(member => member.id === selectedMember.id);
    setSelectedMember(latest ? { ...latest, biometricStatus: result.duplicate ? 'duplicate_attempt' : 'verified_checked_in' } : selectedMember);
    addToast({ type: result.ok ? 'success' : 'warning', title: result.message });
  };

  const handleAccessClaim = (item: AccessItemType) => {
    const allowed = item === 'food' ? canClaimFood : item === 'souvenir' ? canClaimSouvenir : item === 'activity' ? canRecordActivity : canVerify;
    if (!allowed) {
      addToast({ type: 'warning', title: 'You do not have permission for this action.' });
      return;
    }
    if (!selectedMember) return;
    const result = claimAccessItem(selectedMember.id, item, actorEmail, actorName);
    addToast({ type: result.ok ? 'success' : 'warning', title: result.message });
    setSelectedMember(prev => prev ? {
      ...prev,
      accessClaims: result.ok ? { ...(prev.accessClaims ?? {}), [item]: new Date().toISOString() } : prev.accessClaims,
    } : prev);
  };

  return (
    <AdminLayout
      pageTitle="Biometric Operations Control"
      pageSubtitle="Demo mode interface for USB or network fingerprint SDKs through a local WebSocket bridge."
    >
      <div className="mb-6 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-end">
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-portal-line bg-portal-surface px-4 py-3 text-portal-ink">
          <Radio className="w-4 h-4 animate-pulse" />
          <span className="truncate text-sm font-medium">Demo mode: no scanner connected</span>
        </div>
      </div>

      <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Pending Verification', value: pendingMembers.length, icon: Fingerprint, tone: 'text-amber-500 bg-amber-500/10' },
          { label: 'Biometric Verified', value: verifiedMembers.length, icon: ShieldCheck, tone: 'text-portal-ink bg-portal-surface' },
          { label: 'Duplicate Alerts', value: duplicates.length, icon: AlertTriangle, tone: 'text-red-500 bg-red-500/10' },
          { label: 'Demo Devices', value: biometricDevices.length, icon: Cpu, tone: 'text-portal-ink bg-portal-surface' },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            className="rounded-[20px] p-5 backdrop-blur-glass border bg-white/70 dark:bg-portal-surface border-white/45 dark:border-white/[0.08]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${item.tone}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <p className="font-mono text-3xl font-bold text-portal-ink dark:text-white mt-4">{item.value}</p>
            <p className="text-xs text-portal-label mt-1">{item.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
        <motion.div
          className="portal-card min-w-0 p-4 sm:p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-5 flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white">Member Lookup</h3>
              <p className="text-xs text-portal-label mt-1">Search by name, member ID, QR code, or phone.</p>
            </div>
            <span className="shrink-0 rounded-full border border-portal-line px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.04em] text-portal-label">Demo scanner</span>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-portal-label" />
            <PortalInput
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                if (e.target.value.length < 2) setSelectedMember(null);
              }}
              placeholder="Search member, scan QR code, or enter member ID..."
              className="pl-12"
            />
            {search.length > 1 && !selectedMember && (
              <div className="absolute top-full left-0 right-0 z-20 mt-2 rounded-2xl border bg-white dark:bg-portal-surface border-portal-line dark:border-white/10 shadow-xl overflow-hidden">
                {searchResults.length === 0 ? (
                  <p className="p-4 text-sm text-portal-label text-center">No member found</p>
                ) : searchResults.map(member => (
                  <button key={member.id} onClick={() => selectMember(member)} className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-portal-surface dark:hover:bg-white/5">
                    <div>
                      <p className="text-sm font-semibold text-portal-ink dark:text-white">{member.fullName}</p>
                      <p className="text-xs text-portal-label font-mono">{member.id} - {member.conventionGroup}</p>
                    </div>
                    <span className={`${statusMeta(member.biometricStatus).badge} text-[10px]`}>{statusMeta(member.biometricStatus).label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {selectedMember ? (
              <motion.div
                key={selectedMember.id}
                className="mt-6 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="rounded-[22px] p-6 bg-portal-dark text-white overflow-hidden relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(138,138,133,0.28),transparent_40%)]" />
                  <div className="relative z-10 text-center">
                    <motion.div
                      className="w-32 h-32 rounded-full mx-auto bg-portal-surface border border-portal-line flex items-center justify-center"
                      animate={scannerPulse}
                      transition={{ duration: 1.2, repeat: scanning ? Infinity : 0 }}
                    >
                      <Fingerprint className={`w-16 h-16 ${scanning ? 'text-portal-ink animate-pulse' : 'text-portal-ink'}`} />
                    </motion.div>
                    <p className="mt-5 text-sm text-portal-ink">{scanning ? 'Capturing fingerprint template...' : 'Ready for fingerprint capture'}</p>
                    <p className="text-xs text-white/45 mt-2">{onlineDevice?.name ?? 'No scanner connected'}</p>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <h3 className="font-display font-bold text-xl text-portal-ink dark:text-white">{selectedMember.fullName}</h3>
                      <p className="font-mono text-sm text-portal-ink mt-1">{selectedMember.id}</p>
                    </div>
                    <span className={`${statusMeta(selectedMember.biometricStatus).badge}`}>{statusMeta(selectedMember.biometricStatus).label}</span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      { label: 'Fellowship Band', value: selectedMember.fellowshipBand },
                      { label: 'Department(s)', value: selectedMember.departments.join(', ') },
                      { label: 'Convention Group', value: selectedMember.conventionGroup },
                      { label: 'Registered', value: new Date(selectedMember.registeredAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-[10px] uppercase tracking-wider text-portal-label">{item.label}</p>
                        <p className="text-sm font-medium text-portal-ink dark:text-portal-label mt-1">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={runBiometricScan}
                    disabled={scanning || !canVerify}
                    className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-portal-dark text-white disabled:opacity-70"
                  >
                    {scanning ? <Activity className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                    {scanning ? 'Scanning Fingerprint' : 'Capture and Verify Fingerprint'}
                  </button>

                  {scanResult && (
                    <motion.div
                      className={`mt-4 p-4 rounded-2xl border ${scanResult === 'success' ? 'bg-portal-surface border-portal-line text-portal-ink' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {scanResult === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        {scanResult === 'success' ? 'Verification successful. Attendance recorded.' : 'Duplicate attendance attempt detected.'}
                      </div>
                    </motion.div>
                  )}

                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-portal-ink dark:text-white mb-3">Access Control</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ACCESS_ITEMS.map(item => {
                        const claimed = Boolean(selectedMember.accessClaims?.[item.id]);
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleAccessClaim(item.id)}
                            disabled={item.id === 'food' ? !canClaimFood : item.id === 'souvenir' ? !canClaimSouvenir : item.id === 'activity' ? !canRecordActivity : !canVerify}
                            className={`p-3 rounded-2xl border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${claimed ? 'bg-portal-surface border-portal-line text-portal-ink' : 'bg-portal-surface dark:bg-white/[0.03] border-portal-line dark:border-white/10 text-portal-ink dark:text-portal-label hover:bg-portal-surface dark:hover:bg-white/[0.06]'}`}
                          >
                            <Icon className="w-4 h-4 mb-2" />
                            <p className="text-sm font-medium">{claimed ? `${item.label} Claimed` : item.label}</p>
                            <p className="text-[11px] opacity-70 mt-1">{claimed ? 'Duplicate claims blocked' : 'Requires biometric verification'}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="mt-6 rounded-[22px] border border-dashed border-portal-line p-7 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Sparkles className="w-10 h-10 text-portal-ink mx-auto mb-3" />
                <p className="text-sm text-portal-label">Search or scan a QR code to load member details instantly.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="min-w-0 space-y-6">
          <motion.div
            className="portal-card p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Device Status</h3>
            <div className="space-y-3">
              {biometricDevices.map(device => (
                <div key={device.id} className="p-4 rounded-2xl bg-portal-surface dark:bg-white/[0.03] border border-portal-line dark:border-white/[0.06]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-portal-ink dark:text-white">{device.name}</p>
                      <p className="text-xs text-portal-label mt-1">{device.vendor} - {device.connectionType}</p>
                    </div>
                    <span className="rounded-full border border-portal-line px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.04em] text-portal-label">Demo</span>
                  </div>
                  <p className="text-[11px] text-portal-label mt-3">Simulated device activity</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="portal-card p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Demo Verification Feed</h3>
            <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-thin">
              {(biometricLogs.length ? biometricLogs : [
                { id: 'empty', status: 'failed' as const, message: 'Waiting for scanner activity', createdAt: new Date().toISOString(), scannerId: 'bio-bridge-01' },
              ]).slice(0, 10).map(log => (
                <div key={log.id} className="flex items-start gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${log.status === 'success' ? 'bg-portal-dark' : log.status === 'duplicate' ? 'bg-red-500' : 'bg-amber-500'} animate-pulse`} />
                  <div className="min-w-0">
                    <p className="text-sm text-portal-ink dark:text-portal-label">{log.memberName ?? log.message}</p>
                    <p className="text-xs text-portal-label mt-1">{log.message} - {new Date(log.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="portal-card p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Recently Verified</h3>
            <div className="space-y-3">
              {recentVerified.map(record => (
                <div key={record.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-portal-ink dark:text-white">{record.memberName}</p>
                    <p className="text-xs font-mono text-portal-label">{record.memberId}</p>
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
