import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, ShieldCheck, Copy, QrCode, Trash2, Search, FileSpreadsheet, Ban, RotateCcw, Download, Mail } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { downloadCanvas, downloadCsv } from '@/lib/format';
import { PortalInput, PortalSelect } from '@/components/ui-kit/FormControls';
import { DataTable } from '@/components/ui-kit/DataTable';
import { sendRegistrationConfirmation } from '@/lib/registrationEmail';
import { createTagImage } from '@/lib/tagImage';
import { formatDateTime } from '@/lib/format';
import { AttendeeProfileDialog } from '@/components/AttendeeProfileDialog';
import type { Attendee, RegistrationKind } from '@/types';

const biometricBadge = (status?: string) => {
  if (status === 'verified_checked_in') return { className: 'status-badge-green', label: 'Biometric Verified' };
  if (status === 'fingerprint_enrolled') return { className: 'status-badge-blue', label: 'Fingerprint Enrolled' };
  if (status === 'duplicate_attempt') return { className: 'status-badge-red', label: 'Duplicate Attempt Detected' };
  return { className: 'status-badge-amber', label: 'Pending Verification' };
};

const LINK_STATUS_BADGE = { active: 'status-badge-green', expired: 'status-badge-amber', inactive: 'status-badge-red' } as const;
const PAGE_SIZE = 10;

export function AdminRegistrations() {
  const { members, executives, registrationLinks, bands, churchGroups, currentEvent, createRegistrationLink, setRegistrationLinkActive, deleteAttendee, updateAttendee, refreshAttendee } = useAppData();
  const [emailingId, setEmailingId] = useState<string | null>(null);

  /** Resends the confirmation email (with the tag attached) through the send-registration-email function. */
  const resendEmail = async (row: Attendee) => {
    setEmailingId(row.id);
    try {
      let tagPng: string | undefined;
      try { tagPng = await createTagImage(row, currentEvent?.name ?? 'Youth convention', row.kind); } catch { tagPng = undefined; }
      await sendRegistrationConfirmation(row.statusToken, { tagPng, force: true });
      addToast({ type: 'success', title: `Confirmation email sent to ${row.email}` });
    } catch (error) {
      addToast({ type: 'error', title: 'Email not sent', description: error instanceof Error ? error.message : undefined, duration: 7000 });
    } finally {
      setEmailingId(null);
      void refreshAttendee(row.id).catch(() => undefined);
    }
  };
  const { addToast } = useToast();
  const canRegister = usePermission('register');
  const canCreateLinks = usePermission('create_links');
  const canManage = usePermission('manage');
  const [kind, setKind] = useState<RegistrationKind>('member');
  const [search, setSearch] = useState('');
  const [bandFilter, setBandFilter] = useState('All');
  const [groupFilter, setGroupFilter] = useState('All');
  const [qrUrl, setQrUrl] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Attendee | null>(null);
  // Looked up from the live lists so the profile reflects realtime changes.
  const [profileId, setProfileId] = useState<string | null>(null);
  const profile = profileId ? [...members, ...executives].find(item => item.id === profileId) ?? null : null;
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const source = kind === 'member' ? members : executives;
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return source.filter(row => {
      const matchesSearch = !query || row.fullName.toLowerCase().includes(query) || row.code.toLowerCase().includes(query) || row.phoneNumber.includes(query) || row.email.includes(query);
      const matchesBand = bandFilter === 'All' || (bandFilter === 'None' ? !row.bandId : row.bandId === bandFilter);
      const matchesGroup = groupFilter === 'All' || row.groupId === groupFilter;
      return matchesSearch && matchesBand && matchesGroup;
    });
  }, [source, search, bandFilter, groupFilter]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const run = async (action: () => Promise<void>, failure: string) => {
    setBusy(true);
    try { await action(); } catch (error) {
      addToast({ type: 'error', title: failure, description: error instanceof Error ? error.message : undefined });
    } finally { setBusy(false); }
  };

  const generateLink = (type: RegistrationKind) => run(async () => {
    const link = await createRegistrationLink(type);
    await navigator.clipboard.writeText(link.url).catch(() => undefined);
    addToast({ type: 'success', title: `${type === 'member' ? 'Member' : 'Executive'} link generated and copied!` });
  }, 'Could not create link');

  const handleDelete = (attendee: Attendee) => run(async () => {
    await deleteAttendee(attendee);
    setDeleteTarget(null);
    addToast({ type: 'success', title: `${attendee.fullName} deleted` });
  }, 'Could not delete');

  const exportCsv = () => {
    const isMember = kind === 'member';
    downloadCsv(
      `${currentEvent?.name ?? 'convention'}-${isMember ? 'members' : 'executives'}.csv`.replace(/\s+/g, '-').toLowerCase(),
      ['ID', 'Full name', 'Email', 'Phone', 'Gender', 'Date of birth', 'Band', 'Group', 'Departments', 'Church branch', 'Leadership role', 'First timer', 'Wants membership', 'Followed up', 'Biometric', 'Food', 'Souvenir', 'Confirmation email', 'Registered'],
      filtered.map(row => [
        row.code, row.fullName, row.email, row.phoneNumber, row.gender, row.dateOfBirth, row.fellowshipBand, row.conventionGroup,
        row.departments.join('; '), row.churchBranch, row.leadershipRole, row.isFirstTimer ? 'Yes' : 'No',
        row.wantsPermanentMembership === null ? '' : row.wantsPermanentMembership ? 'Yes' : 'No', row.firstTimerFollowedUp ? 'Yes' : 'No',
        biometricBadge(row.biometricStatus).label, row.accessClaims.food ?? '', row.accessClaims.souvenir ?? '', row.confirmationEmailSentAt ? `Sent ${row.confirmationEmailSentAt}` : row.confirmationEmailError ? `Failed: ${row.confirmationEmailError}` : 'Not sent', row.registeredAt,
      ]),
    );
  };

  return (
    <AdminLayout pageTitle="Registration Management" pageSubtitle="Create registration links and review member and executive registrations.">
      {canCreateLinks && (
        <motion.div className="portal-card mb-6 min-w-0 p-5 sm:p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-6">Generate Registration Links</h3>
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
            <motion.button disabled={busy} className="flex min-w-0 flex-1 items-center gap-4 rounded-[30px] bg-portal-accent p-5 text-portal-accent-ink shadow-sm transition-shadow hover:shadow-md disabled:opacity-70" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => void generateLink('member')}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/50"><Link2 className="w-5 h-5" /></span>
              <div className="min-w-0 text-left">
                <p className="truncate font-semibold">Member Registration Link</p>
                <p className="text-xs opacity-70">For regular youth fellowship members</p>
              </div>
            </motion.button>
            <motion.button disabled={busy} className="flex min-w-0 flex-1 items-center gap-4 rounded-[30px] bg-portal-dark p-5 text-white shadow-sm transition-shadow hover:shadow-md disabled:opacity-70" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => void generateLink('executive')}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10"><ShieldCheck className="w-5 h-5" /></span>
              <div className="min-w-0 text-left">
                <p className="truncate font-semibold">Executive Registration Link</p>
                <p className="text-xs opacity-70">For youth fellowship leaders</p>
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}

      {registrationLinks.length > 0 && (
        <motion.div className="portal-card mb-6 min-w-0 p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Generated Links</h3>
          <div className="table-scroll">
            <DataTable className="fit-table">
              <thead>
                <tr className="border-b border-portal-line dark:border-white/[0.06]">
                  {['Type', 'URL', 'Created', 'Uses', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium uppercase tracking-[0.04em] text-portal-label pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrationLinks.map(link => (
                  <tr key={link.id} className="border-b border-portal-line dark:border-white/[0.04]">
                    <td className="py-3 pr-4"><span className={`status-badge-${link.type === 'member' ? 'blue' : 'purple'} text-[10px]`}>{link.type}</span></td>
                    <td className="py-3 pr-4"><span className="cell-truncate text-sm text-portal-label">{link.url}</span></td>
                    <td className="py-3 pr-4 text-sm text-portal-label">{new Date(link.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4 text-sm font-mono text-portal-label">{link.uses}{link.maxUses ? ` / ${link.maxUses}` : ''}</td>
                    <td className="py-3 pr-4"><span className={`${LINK_STATUS_BADGE[link.status]} text-[10px]`}>{link.status}</span></td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button title="Copy link" onClick={() => { void navigator.clipboard.writeText(link.url); addToast({ type: 'success', title: 'Copied!' }); }} className="p-1.5 rounded-lg hover:bg-portal-surface transition-colors"><Copy className="w-4 h-4 text-portal-label" /></button>
                        <button title="Show QR code" onClick={() => setQrUrl(link.url)} className="p-1.5 rounded-lg hover:bg-portal-surface transition-colors"><QrCode className="w-4 h-4 text-portal-label" /></button>
                        {canCreateLinks && (
                          <button title={link.status === 'inactive' ? 'Reactivate link' : 'Deactivate link'} disabled={busy} onClick={() => void run(() => setRegistrationLinkActive(link.id, link.status === 'inactive'), 'Could not update link')} className="p-1.5 rounded-lg hover:bg-portal-surface transition-colors">
                            {link.status === 'inactive' ? <RotateCcw className="w-4 h-4 text-portal-label" /> : <Ban className="w-4 h-4 text-red-400" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </motion.div>
      )}

      <motion.div className="portal-card min-w-0 p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            {(['member', 'executive'] as const).map(option => (
              <button key={option} onClick={() => { setKind(option); setPage(0); setBandFilter('All'); setGroupFilter('All'); }} className={`min-h-10 rounded-full px-4 text-sm font-medium ${kind === option ? 'bg-portal-dark text-white' : 'border border-portal-line text-portal-ink'}`}>
                {option === 'member' ? `Members (${members.length})` : `Executives (${executives.length})`}
              </button>
            ))}
          </div>
          <button onClick={exportCsv} disabled={filtered.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-portal-surface text-portal-ink hover:bg-portal-surface transition-colors disabled:opacity-50">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV ({filtered.length})
          </button>
        </div>

        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-portal-label" />
            <PortalInput value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search by name, ID, email or phone..." className="pl-10" />
          </div>
          <PortalSelect value={bandFilter} onChange={e => { setBandFilter(e.target.value); setPage(0); }} className="w-full py-2 sm:w-auto">
            <option value="All">All Bands</option>
            {bands.map(band => <option key={band.id} value={band.id}>{band.name}</option>)}
            <option value="None">None</option>
          </PortalSelect>
          {kind === 'member' && (
            <PortalSelect value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setPage(0); }} className="w-full py-2 sm:w-auto">
              <option value="All">All Groups</option>
              {churchGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
            </PortalSelect>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-portal-label">{source.length === 0 ? `No ${kind}s have registered yet.` : 'No registrations match these filters.'}</p>
        ) : (
          <div className="table-scroll">
            <DataTable className="fit-table">
              <thead>
                <tr className="border-b border-portal-line dark:border-white/[0.06]">
                  {[kind === 'member' ? 'Member ID' : 'Executive ID', 'Full Name', kind === 'member' ? 'Band' : 'Role', 'Departments', kind === 'member' ? 'Group' : 'Band', 'Registered', 'Biometric', 'Food', 'Souvenir', 'Email', ...(kind === 'member' ? ['First timer'] : []), 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-medium uppercase tracking-[0.04em] text-portal-label pb-3 pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(row => (
                  <tr key={row.id} className="border-b border-portal-line dark:border-white/[0.04] hover:bg-portal-surface transition-colors">
                    <td className="py-3 pr-3"><span className="rounded-md bg-portal-surface px-2 py-1 font-mono text-xs text-portal-ink">{row.code}</span></td>
                    <td className="py-3 pr-3">
                      <button type="button" onClick={() => setProfileId(row.id)} title="View profile" className="block max-w-full text-left">
                        <span className="cell-truncate text-sm font-medium text-portal-ink underline-offset-2 hover:underline">{row.fullName}</span>
                        <span className="cell-truncate text-xs text-portal-label">{row.email}</span>
                      </button>
                    </td>
                    <td className="py-3 pr-3"><span className="portal-tag text-[10px]">{kind === 'member' ? row.fellowshipBand : row.leadershipRole || '—'}</span></td>
                    <td className="py-3 pr-3"><span className="cell-truncate text-xs text-portal-label">{row.departments.slice(0, 2).join(', ') || '—'}{row.departments.length > 2 ? ` +${row.departments.length - 2}` : ''}</span></td>
                    <td className="py-3 pr-3"><span className="portal-tag text-[10px]">{kind === 'member' ? row.conventionGroup : row.fellowshipBand}</span></td>
                    <td className="py-3 pr-3 text-xs text-portal-label">{new Date(row.registeredAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td className="py-3 pr-3"><span className={`${biometricBadge(row.biometricStatus).className} text-[10px]`}>{biometricBadge(row.biometricStatus).label}</span></td>
                    <td className="py-3 pr-3"><span className={`${row.accessClaims.food ? 'status-badge-green' : 'status-badge-amber'} text-[10px]`}>{row.accessClaims.food ? 'Collected' : 'Pending'}</span></td>
                    <td className="py-3 pr-3"><span className={`${row.accessClaims.souvenir ? 'status-badge-green' : 'status-badge-amber'} text-[10px]`}>{row.accessClaims.souvenir ? 'Collected' : 'Pending'}</span></td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-1">
                        <span
                          title={row.confirmationEmailSentAt ? `Sent ${formatDateTime(row.confirmationEmailSentAt)}` : row.confirmationEmailError ?? 'Not sent'}
                          className={`${row.confirmationEmailSentAt ? 'status-badge-green' : row.confirmationEmailError ? 'status-badge-red' : 'status-badge-amber'} text-[10px]`}
                        >
                          {row.confirmationEmailSentAt ? 'Sent' : row.confirmationEmailError ? 'Failed' : 'Not sent'}
                        </span>
                        {canRegister && (
                          <button aria-label={`Resend confirmation email to ${row.fullName}`} title="Send confirmation email again" disabled={emailingId === row.id} onClick={() => void resendEmail(row)} className="p-1.5 rounded-lg hover:bg-portal-surface transition-colors disabled:opacity-50">
                            <Mail className={`w-4 h-4 text-portal-label ${emailingId === row.id ? 'animate-pulse' : ''}`} />
                          </button>
                        )}
                      </div>
                    </td>
                    {kind === 'member' && (
                      <td className="py-3 pr-3">
                        {row.isFirstTimer ? (
                          <label className="flex items-center gap-1.5 text-xs text-portal-label">
                            <input type="checkbox" checked={row.firstTimerFollowedUp} disabled={!canRegister || busy} onChange={event => void run(() => updateAttendee(row.id, { firstTimerFollowedUp: event.target.checked }), 'Could not update follow-up')} />
                            Followed up
                          </label>
                        ) : <span className="text-xs text-portal-label">—</span>}
                      </td>
                    )}
                    <td className="py-3">
                      {canManage && (
                        <button aria-label={`Delete ${row.fullName}`} onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-portal-label">Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
            <div className="flex flex-wrap items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${i === page ? 'bg-portal-dark text-white' : 'bg-portal-surface text-portal-label hover:bg-portal-surface'}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {qrUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setQrUrl('')} />
          <motion.div className="relative glass-modal dark:glass-modal-dark p-8" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <div ref={qrRef} className="bg-white p-4 rounded-2xl"><QRCodeCanvas value={qrUrl} size={240} marginSize={2} /></div>
            <p className="text-center text-sm text-portal-label mt-4 truncate max-w-[260px]">{qrUrl}</p>
            <button onClick={() => downloadCanvas(qrRef.current, 'registration-qr.png')} className="mx-auto mt-4 flex min-h-11 items-center gap-1 rounded-full border border-portal-line px-4 text-sm text-portal-ink">
              <Download className="w-4 h-4" /> Download QR
            </button>
          </motion.div>
        </div>
      )}

      {profile && <AttendeeProfileDialog attendee={profile} onClose={() => setProfileId(null)} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <motion.div className="relative glass-modal dark:glass-modal-dark p-6 max-w-sm w-full" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <h3 className="font-display font-bold text-lg text-portal-ink dark:text-white mb-2">Delete {deleteTarget.fullName}?</h3>
            <p className="text-sm text-portal-label mb-4">This removes the registration, attendance, access claims and fingerprint templates. It cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-portal-line text-sm font-medium text-portal-ink hover:bg-portal-surface transition-colors">Cancel</button>
              <button disabled={busy} onClick={() => void handleDelete(deleteTarget)} className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-70">Delete</button>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}
