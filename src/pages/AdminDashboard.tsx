import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Users, Shield, UserCheck, Activity, Link2, ShieldCheck, QrCode, Copy, Download, X, ArrowUpRight } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AdminLayout } from '@/components/AdminLayout';
import { StatCard } from '@/components/StatCard';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { downloadCanvas, initials, seriesColor, timeAgo } from '@/lib/format';
import { InviteLinkDialog } from '@/components/InviteLinkDialog';
import { WORKSPACE_ROLE_LABELS, roleOptionLabel, type Attendee, type RegistrationKind, type WorkspaceRole } from '@/types';

// Staff roles first (the default pick), then admin (full access).
const ACCESS_ROLES: WorkspaceRole[] = [...(Object.keys(WORKSPACE_ROLE_LABELS) as WorkspaceRole[]).filter(role => role !== 'admin'), 'admin'];

const biometricStatusLabel = (status?: string) => {
  if (status === 'verified_checked_in') return { label: 'Biometric Verified', className: 'status-badge-green' };
  if (status === 'fingerprint_enrolled') return { label: 'Fingerprint Enrolled', className: 'portal-tag' };
  if (status === 'duplicate_attempt') return { label: 'Duplicate Attempt Detected', className: 'status-badge-red' };
  return { label: 'Pending', className: 'status-badge-amber' };
};

const ACTION_COLORS: Record<string, string> = {
  registration: 'var(--accent)',
  verification: 'var(--label-ink)',
  attendance: 'var(--label-ink)',
  access: 'var(--dark-card)',
  role: 'var(--accent)',
  settings: 'var(--dark-card)',
};

export function AdminDashboard() {
  const reducedMotion = useReducedMotion();
  const { members, executives, attendance, adminActivities, bands, leadershipRoles, today, workspaceMembers, createRegistrationLink, updateAttendee, inviteStaff } = useAppData();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const canRegister = usePermission('register');
  const canCreateLinks = usePermission('create_links');
  const canManage = usePermission('manage');
  const activeLeadershipRoles = useMemo(() => leadershipRoles.filter(role => role.active).map(role => role.name), [leadershipRoles]);
  const [accessRole, setAccessRole] = useState<Record<string, WorkspaceRole>>({});
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<{ email: string; link: string } | null>(null);

  const rolesFor = (email: string) => workspaceMembers.filter(member => member.email.toLowerCase() === email.toLowerCase()).map(member => member.role);

  const availableRoles = (email: string) => rolesFor(email).includes('admin') ? [] : ACCESS_ROLES.filter(role => !rolesFor(email).includes(role));

  const giveAccess = async (exec: Attendee, role: WorkspaceRole) => {
    setInvitingId(exec.id);
    try {
      const result = await inviteStaff(exec.email, role, exec.fullName);
      if (result.status === 'link' && result.actionLink) {
        setShareLink({ email: exec.email, link: result.actionLink });
      } else {
        addToast({
          type: 'success',
          title: `${exec.fullName} can now sign in as ${WORKSPACE_ROLE_LABELS[role]}`,
          description: result.status === 'invited' ? `An invite email was sent to ${exec.email}.` : 'They already had a login.',
          duration: 7000,
        });
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Could not give access', description: error instanceof Error ? error.message : undefined });
    } finally {
      setInvitingId(null);
    }
  };
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkType, setLinkType] = useState<RegistrationKind>('member');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [generating, setGenerating] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const checkedInAttendees = useMemo(() => new Set(attendance.map(record => record.attendeeId)).size, [attendance]);
  const todayCheckIns = useMemo(() => attendance.filter(record => record.attendanceDate === today).length, [attendance, today]);

  const bandData = useMemo(() => {
    const rows = bands.map((band, index) => ({
      name: band.name,
      value: members.filter(member => member.bandId === band.id).length,
      color: seriesColor(index, band.color),
    }));
    const unbanded = members.filter(member => !member.bandId).length;
    if (unbanded) rows.push({ name: 'None', value: unbanded, color: 'var(--muted)' });
    return rows.filter(row => row.value > 0);
  }, [bands, members]);

  const generateLink = async (type: RegistrationKind, withQr = false) => {
    if (!canCreateLinks) {
      addToast({ type: 'warning', title: 'You do not have permission to create registration links.' });
      return;
    }
    setGenerating(true);
    try {
      const link = await createRegistrationLink(type);
      setGeneratedUrl(link.url);
      setLinkType(type);
      setShowQR(withQr);
      setShowLinkModal(true);
    } catch (error) {
      addToast({ type: 'error', title: 'Could not create link', description: error instanceof Error ? error.message : undefined });
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(generatedUrl);
    addToast({ type: 'success', title: 'Link copied to clipboard!' });
  };

  const updateExecutiveRole = async (executiveId: string, leadershipRole: string) => {
    const executive = executives.find(exec => exec.id === executiveId);
    if (!executive || executive.leadershipRole === leadershipRole) return;
    try {
      await updateAttendee(executiveId, { leadershipRole });
      addToast({ type: 'success', title: `${executive.fullName} assigned as ${leadershipRole}` });
    } catch (error) {
      addToast({ type: 'error', title: 'Could not update role', description: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <AdminLayout stats={
      <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 xl:w-[62%]">
        <StatCard icon={Users} iconColor="currentColor" iconBg="transparent" label="Total Youth Members" value={members.length} delay={0} />
        <StatCard icon={Shield} iconColor="currentColor" iconBg="transparent" label="Total Executives" value={executives.length} delay={0.1} />
        <StatCard icon={UserCheck} iconColor="currentColor" iconBg="transparent" label="Checked-in Attendees" value={checkedInAttendees} delay={0.2} />
        <StatCard icon={Activity} iconColor="currentColor" iconBg="transparent" label="Check-ins Today" value={todayCheckIns} isLive delay={0.3} />
      </div>
    }>
      <div className="portal-dashboard">
      {/* Quick Actions */}
      <div className="mb-8 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        {[
          { icon: Link2, label: 'Generate Member Link', sub: 'For regular members', surface: 'bg-portal-accent text-portal-accent-ink', action: () => generateLink('member') },
          { icon: ShieldCheck, label: 'Generate Executive Link', sub: 'For youth leaders', surface: 'bg-portal-dark text-white', action: () => generateLink('executive') },
          { icon: QrCode, label: 'Generate QR Code', sub: 'Member registration QR for onsite sign-up', surface: 'border border-portal-line bg-portal-surface text-portal-ink', action: () => generateLink('member', true) },
        ].map(item => (
          <motion.button
            key={item.label}
            disabled={generating}
            className={`portal-focus relative flex min-h-[192px] min-w-0 flex-col items-start rounded-[30px] p-6 text-left disabled:opacity-70 ${item.surface}`}
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            whileHover={reducedMotion ? undefined : { y: -3 }}
            onClick={item.action}
          >
            <span className="mb-6 flex h-11 w-11 items-center justify-center rounded-full border border-current"><item.icon aria-hidden="true" className="h-5 w-5" /></span>
            <span className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-current"><ArrowUpRight aria-hidden="true" className="h-4 w-4" /></span>
            <span className="text-base font-medium">{item.label}</span>
            <span className="mt-1 text-xs opacity-70">{item.sub}</span>
          </motion.button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Recent Registrations */}
        <motion.div
          className="portal-card rounded-[28px] p-4 sm:p-6"
          initial={reducedMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mb-6 flex min-w-0 items-center justify-between gap-3">
            <h3 className="text-lg font-medium text-portal-ink">Recent Registrations</h3>
            <button onClick={() => navigate('/admin/registrations')} className="portal-focus min-h-11 shrink-0 rounded-full border border-portal-line px-4 text-xs text-portal-ink">View All</button>
          </div>
          {members.length === 0 ? (
            <p className="py-10 text-center text-sm text-portal-label">No members have registered yet. Share a member registration link to get started.</p>
          ) : (
            <div className="table-scroll">
              <table className="portal-data-table">
                <thead>
                  <tr className="border-b border-portal-line">
                    {['Name', 'Member ID', 'Band', 'Department(s)', 'Group', 'Registered', 'Verification'].map(h => (
                      <th key={h} className="text-left text-xs font-medium uppercase tracking-[0.04em] text-portal-label pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.slice(0, 8).map((member) => {
                    const status = biometricStatusLabel(member.biometricStatus);
                    return (
                      <motion.tr
                        key={member.id}
                        className="border-b border-portal-line hover:bg-portal-surface transition-colors"
                        initial={reducedMotion ? false : { opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <td className="py-3 pr-4">
                          <div className="flex min-w-0 items-center gap-3">
                            {member.profilePhoto
                              ? <img src={member.profilePhoto} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                              : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-portal-dark text-xs font-medium text-white">{initials(member.fullName)}</div>}
                            <span className="cell-truncate text-sm font-medium text-portal-ink">{member.fullName}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4"><span className="portal-tag font-mono">{member.code}</span></td>
                        <td className="py-3 pr-4"><span className="portal-tag">{member.fellowshipBand}</span></td>
                        <td className="py-3 pr-4"><span className="cell-truncate text-xs text-portal-label">{member.departments.slice(0, 2).join(', ') || '—'}</span></td>
                        <td className="py-3 pr-4"><span className="portal-tag">{member.conventionGroup}</span></td>
                        <td className="py-3 pr-4 text-xs text-portal-label">{new Date(member.registeredAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                        <td className="py-3">
                          <span title={status.label} className={`${status.className} whitespace-nowrap rounded-full text-[10px]`}>{status.label}</span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Right Column */}
        <div className="min-w-0 space-y-6">
          {/* Live Activity */}
          <motion.div
            className="portal-card rounded-[28px] p-6"
            initial={reducedMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-portal font-medium text-lg text-portal-ink">Live Activity</h3>
              <span className="w-2 h-2 rounded-full bg-portal-dark animate-pulse" />
            </div>
            <div className="portal-activity-scroll max-h-[280px] space-y-4 overflow-y-auto" tabIndex={0} aria-label="Recent activity">
              {adminActivities.length === 0 && <p className="text-sm text-portal-label">No activity yet.</p>}
              {adminActivities.slice(0, 20).map(activity => (
                <div key={activity.id} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: ACTION_COLORS[activity.action] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-portal-ink">{activity.target}</p>
                    <p className="text-xs text-portal-label mt-0.5">{activity.actorName} · {timeAgo(activity.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Fellowship Distribution */}
          <motion.div
            className="portal-card rounded-[28px] p-6"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="font-portal font-medium text-lg text-portal-ink mb-4">Fellowship Band Distribution</h3>
            {bandData.length === 0 ? <p className="text-sm text-portal-label">No members yet.</p> : (
              <>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={bandData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" isAnimationActive={!reducedMotion} animationDuration={220}>
                        {bandData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-from)', border: '1px solid var(--surface-line)', borderRadius: '12px', color: 'var(--ink)', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {bandData.map(band => (
                    <div key={band.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: band.color }} />
                      <span className="text-xs text-portal-label">{band.name} ({band.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>

      <motion.div
        className="portal-card mt-6 rounded-[28px] p-4 sm:p-6"
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="mb-5 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-portal text-lg font-medium text-portal-ink">Exco Role Assignments</h3>
            <p className="mt-1 text-sm text-portal-label">Assign or update each registered executive's convention responsibility. Roles come from Convention → Leadership Roles.</p>
          </div>
          <span className="portal-tag w-fit">{executives.length} registered excos</span>
        </div>

        {executives.length === 0 ? <p className="py-6 text-center text-sm text-portal-label">No executives have registered yet.</p> : (
          <div className="table-scroll">
            <table className="portal-data-table">
              <thead>
                <tr className="border-b border-portal-line">
                  {['Executive', 'Department', 'Band', 'Assigned Role', 'Dashboard Access'].map(header => (
                    <th key={header} className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-[0.04em] text-portal-label">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {executives.map(exec => (
                  <tr key={exec.id} className="border-b border-portal-line">
                    <td className="py-4 pr-4">
                      <p className="cell-truncate text-sm font-semibold text-portal-ink">{exec.fullName}</p>
                      <p className="cell-truncate text-xs text-portal-label">{exec.email}</p>
                    </td>
                    <td className="py-4 pr-4"><span className="portal-tag">{exec.departments.join(', ') || '—'}</span></td>
                    <td className="py-4 pr-4"><span className="portal-tag">{exec.fellowshipBand}</span></td>
                    <td className="py-4 pr-4">
                      <select
                        value={exec.leadershipRole}
                        disabled={!canRegister}
                        onChange={event => void updateExecutiveRole(exec.id, event.target.value)}
                        aria-label={`Assigned role for ${exec.fullName}`}
                        className="portal-focus min-h-11 min-w-[220px] rounded-full border border-portal-line bg-portal-from px-3 py-2 text-sm text-portal-ink"
                      >
                        {!activeLeadershipRoles.includes(exec.leadershipRole) && <option value={exec.leadershipRole}>{exec.leadershipRole || 'Unassigned'}</option>}
                        {activeLeadershipRoles.map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex min-w-[240px] flex-wrap items-center gap-2">
                        {rolesFor(exec.email).map(role => <span key={role} className="status-badge-green text-[10px]">{WORKSPACE_ROLE_LABELS[role]}</span>)}
                        {canManage && availableRoles(exec.email).length > 0 && (
                          <>
                            <select
                              aria-label={`Dashboard role for ${exec.fullName}`}
                              value={accessRole[exec.id] && availableRoles(exec.email).includes(accessRole[exec.id]) ? accessRole[exec.id] : availableRoles(exec.email)[0]}
                              onChange={event => setAccessRole(prev => ({ ...prev, [exec.id]: event.target.value as WorkspaceRole }))}
                              className="portal-focus min-h-10 rounded-full border border-portal-line bg-portal-from px-3 text-xs text-portal-ink"
                            >
                              {availableRoles(exec.email).map(role => <option key={role} value={role}>{roleOptionLabel(role)}</option>)}
                            </select>
                            <button
                              onClick={() => void giveAccess(exec, accessRole[exec.id] && availableRoles(exec.email).includes(accessRole[exec.id]) ? accessRole[exec.id] : availableRoles(exec.email)[0])}
                              disabled={invitingId === exec.id}
                              className="portal-focus min-h-10 rounded-full bg-portal-dark px-3 text-xs font-medium text-white disabled:opacity-60"
                            >
                              {invitingId === exec.id ? 'Sending…' : rolesFor(exec.email).length ? 'Add role' : 'Give access'}
                            </button>
                          </>
                        )}
                        {!canManage && rolesFor(exec.email).length === 0 && <span className="text-xs text-portal-label">No access</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {shareLink && <InviteLinkDialog email={shareLink.email} link={shareLink.link} onClose={() => setShareLink(null)} />}

      {/* Link Generation Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLinkModal(false)} />
          <motion.div
            className="portal-card relative max-h-[90dvh] w-full max-w-md overflow-y-auto !bg-portal-from p-5 sm:p-8"
            initial={reducedMotion ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <button aria-label="Close registration link" onClick={() => setShowLinkModal(false)} className="portal-focus absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-portal-label">
              <X className="w-5 h-5" />
            </button>
            <h3 className="mb-4 pr-8 text-xl font-medium text-portal-ink">
              {linkType === 'member' ? 'Member' : 'Executive'} Registration Link
            </h3>
            <div className="flex items-center gap-2 rounded-2xl border border-portal-line p-2">
              <input aria-label="Registration link" value={generatedUrl} readOnly className="min-w-0 flex-1 bg-transparent text-sm text-portal-ink outline-none" />
              <button aria-label="Copy registration link" title="Copy registration link" onClick={() => void copyLink()} className="portal-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-portal-surface">
                <Copy className="w-4 h-4 text-portal-label" />
              </button>
            </div>
            {!showQR ? (
              <button onClick={() => setShowQR(true)} className="portal-focus mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-portal-accent text-portal-accent-ink">
                <QrCode className="w-4 h-4" /> Generate QR Code
              </button>
            ) : (
              <motion.div className="mt-4 flex flex-col items-center" initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                <div ref={qrRef} className="max-w-full rounded-2xl border border-portal-line">
                  <div className="bg-white p-4 rounded-2xl">
                    <QRCodeCanvas value={generatedUrl} size={200} marginSize={2} />
                  </div>
                </div>
                <button onClick={() => downloadCanvas(qrRef.current, `${linkType}-registration-qr.png`)} className="portal-focus mt-4 flex min-h-11 items-center gap-1 rounded-full border border-portal-line px-4 text-sm text-portal-ink">
                  <Download className="w-4 h-4" /> Download QR
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
