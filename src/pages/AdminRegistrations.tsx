import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, ShieldCheck, Copy, QrCode, Trash2, Search, Download, FileSpreadsheet } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import type { FellowshipBand, ConventionGroup } from '@/types';
import { PortalInput, PortalSelect } from '@/components/ui-kit/FormControls';
import { DataTable } from '@/components/ui-kit/DataTable';

const biometricBadge = (status?: string) => {
  if (status === 'verified_checked_in') return { className: 'status-badge-green', label: 'Biometric Verified' };
  if (status === 'fingerprint_enrolled') return { className: 'status-badge-blue', label: 'Fingerprint Enrolled' };
  if (status === 'duplicate_attempt') return { className: 'status-badge-red', label: 'Duplicate Attempt Detected' };
  return { className: 'status-badge-amber', label: 'Pending Biometric Verification' };
};

export function AdminRegistrations() {
  const { members, generatedLinks, bands, churchGroups, addGeneratedLink, deleteMember } = useAppData();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [bandFilter, setBandFilter] = useState<FellowshipBand | 'All'>('All');
  const [groupFilter, setGroupFilter] = useState<ConventionGroup | 'All'>('All');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [memberPage, setMemberPage] = useState(0);
  const PAGE_SIZE = 10;

  const filteredMembers = members.filter(m => {
    const matchesSearch = !search || m.fullName.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase()) || m.phoneNumber.includes(search);
    const matchesBand = bandFilter === 'All' || m.fellowshipBand === bandFilter;
    const matchesGroup = groupFilter === 'All' || m.conventionGroup === groupFilter;
    return matchesSearch && matchesBand && matchesGroup;
  });

  const paginatedMembers = filteredMembers.slice(memberPage * PAGE_SIZE, (memberPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredMembers.length / PAGE_SIZE);

  const generateLink = (type: 'member' | 'executive') => {
    const token = Math.random().toString(36).substring(2, 15);
    const basePath = `${window.location.origin}${window.location.pathname}`;
    const url = `${basePath}#/register/${type}?token=${token}`;
    addGeneratedLink({ type, url, token, uses: 0, status: 'active' });
    navigator.clipboard.writeText(url);
    addToast({ type: 'success', title: `${type === 'member' ? 'Member' : 'Executive'} link generated and copied!` });
  };

  const showQR = (url: string) => {
    setQrUrl(url);
    setShowQRModal(true);
  };

  const handleDelete = (id: string) => {
    deleteMember(id);
    setShowDeleteConfirm(null);
    addToast({ type: 'success', title: 'Member deleted successfully' });
  };

  const exportExcel = () => {
    addToast({ type: 'info', title: 'Exporting to Excel...' });
    setTimeout(() => addToast({ type: 'success', title: 'Excel file downloaded!' }), 1000);
  };

  const exportPDF = () => {
    addToast({ type: 'info', title: 'Exporting to PDF...' });
    setTimeout(() => addToast({ type: 'success', title: 'PDF file downloaded!' }), 1000);
  };

  return (
    <AdminLayout
      pageTitle="Registration Management"
      pageSubtitle="Create registration links and review member and executive registrations."
    >

      {/* Link Generator */}
      <motion.div
        className="portal-card mb-6 min-w-0 p-5 sm:p-8"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      >
        <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-6">Generate Registration Links</h3>
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
          <motion.button
            className="flex min-w-0 flex-1 items-center gap-4 rounded-[30px] bg-portal-accent p-5 text-portal-accent-ink shadow-sm transition-shadow hover:shadow-md"
            whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
            onClick={() => generateLink('member')}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/50"><Link2 className="w-5 h-5" /></span>
            <div className="min-w-0 text-left">
              <p className="truncate font-semibold">Member Registration Link</p>
              <p className="text-xs opacity-70">For regular youth fellowship members</p>
            </div>
          </motion.button>
          <motion.button
            className="flex min-w-0 flex-1 items-center gap-4 rounded-[30px] bg-portal-dark p-5 text-white shadow-sm transition-shadow hover:shadow-md"
            whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
            onClick={() => generateLink('executive')}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10"><ShieldCheck className="w-5 h-5" /></span>
            <div className="min-w-0 text-left">
              <p className="truncate font-semibold">Executive Registration Link</p>
              <p className="text-xs opacity-70">For youth fellowship leaders</p>
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* Generated Links */}
      {generatedLinks.length > 0 && (
        <motion.div
          className="portal-card mb-6 min-w-0 p-4 sm:p-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        >
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
                {generatedLinks.map(link => (
                  <tr key={link.id} className="border-b border-portal-line dark:border-white/[0.04]">
                    <td className="py-3 pr-4">
                      <span className={`status-badge-${link.type === 'member' ? 'blue' : 'purple'} text-[10px]`}>{link.type}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="cell-truncate text-sm text-portal-label dark:text-portal-label">{link.url}</span>
                    </td>
                    <td className="py-3 pr-4 text-sm text-portal-label">{new Date(link.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4 text-sm font-mono text-portal-label dark:text-portal-label">{link.uses}</td>
                    <td className="py-3 pr-4">
                      <span className="status-badge-green text-[10px]">{link.status}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { navigator.clipboard.writeText(link.url); addToast({ type: 'success', title: 'Copied!' }); }} className="p-1.5 rounded-lg hover:bg-portal-surface dark:hover:bg-white/5 transition-colors">
                          <Copy className="w-4 h-4 text-portal-label" />
                        </button>
                        <button onClick={() => showQR(link.url)} className="p-1.5 rounded-lg hover:bg-portal-surface dark:hover:bg-white/5 transition-colors">
                          <QrCode className="w-4 h-4 text-portal-label" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </motion.div>
      )}

      {/* All Members */}
      <motion.div
        className="portal-card min-w-0 p-4 sm:p-6"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white">All Members ({filteredMembers.length})</h3>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-portal-surface text-portal-ink hover:bg-portal-surface transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-portal-label" />
            <PortalInput
              value={search}
              onChange={e => { setSearch(e.target.value); setMemberPage(0); }}
              placeholder="Search by name, ID, or phone..."
              className="pl-10"
            />
          </div>
          <PortalSelect value={bandFilter} onChange={e => { setBandFilter(e.target.value as FellowshipBand | 'All'); setMemberPage(0); }} className="w-full py-2 sm:w-auto">
            <option value="All">All Bands</option>
            {[...bands.filter(band => band.active).map(band => band.name), 'None'].map(band => <option key={band} value={band}>{band}</option>)}
          </PortalSelect>
          <PortalSelect value={groupFilter} onChange={e => { setGroupFilter(e.target.value as ConventionGroup | 'All'); setMemberPage(0); }} className="w-full py-2 sm:w-auto">
            <option value="All">All Groups</option>
            {churchGroups.filter(group => group.active).map(group => <option key={group.id} value={group.name}>{group.name}</option>)}
          </PortalSelect>
        </div>

        {/* Members Table */}
        <div className="table-scroll">
          <DataTable className="fit-table">
            <thead>
              <tr className="border-b border-portal-line dark:border-white/[0.06]">
                {['Member ID', 'Full Name', 'Band', 'Departments', 'Group', 'Registered', 'Biometric', 'Food', 'Souvenir', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-medium uppercase tracking-[0.04em] text-portal-label pb-3 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.map((member, i) => (
                <motion.tr
                  key={member.id}
                  className="border-b border-portal-line dark:border-white/[0.04] hover:bg-portal-surface transition-colors"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                >
                  <td className="py-3 pr-3">
                    <span className="rounded-md bg-portal-surface px-2 py-1 font-mono text-xs text-portal-ink">{member.id}</span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="cell-truncate text-sm font-medium text-portal-ink dark:text-portal-label">{member.fullName}</span>
                  </td>
                  <td className="py-3 pr-3"><span className={`status-badge-${member.fellowshipBand.toLowerCase()} text-[10px]`}>{member.fellowshipBand}</span></td>
                  <td className="py-3 pr-3"><span className="cell-truncate text-xs text-portal-label">{member.departments.slice(0, 2).join(', ')}{member.departments.length > 2 ? ` +${member.departments.length - 2}` : ''}</span></td>
                  <td className="py-3 pr-3"><span className={`status-badge-${member.conventionGroup.toLowerCase().replace(' ', '-')} text-[10px]`}>{member.conventionGroup}</span></td>
                  <td className="py-3 pr-3 text-xs text-portal-label">{new Date(member.registeredAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="py-3 pr-3"><span className={`${biometricBadge(member.biometricStatus).className} text-[10px]`}>{biometricBadge(member.biometricStatus).label}</span></td>
                  <td className="py-3 pr-3">
                    <span className={`${member.accessClaims?.food ? 'status-badge-green' : 'status-badge-amber'} text-[10px]`}>
                      {member.accessClaims?.food ? 'Collected' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`${member.accessClaims?.souvenir ? 'status-badge-green' : 'status-badge-amber'} text-[10px]`}>
                      {member.accessClaims?.souvenir ? 'Collected' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-3">
                    <button onClick={() => setShowDeleteConfirm(member.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </DataTable>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-portal-label">Showing {memberPage * PAGE_SIZE + 1}-{Math.min((memberPage + 1) * PAGE_SIZE, filteredMembers.length)} of {filteredMembers.length}</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setMemberPage(i)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  i === memberPage ? 'bg-portal-dark text-white' : 'bg-portal-surface dark:bg-white/5 text-portal-label hover:bg-portal-surface dark:hover:bg-white/10'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowQRModal(false)} />
          <motion.div className="relative glass-modal dark:glass-modal-dark p-8" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <div className="bg-white p-4 rounded-2xl"><QRCodeSVG value={qrUrl} size={240} /></div>
            <p className="text-center text-sm text-portal-label mt-4 truncate max-w-[260px]">{qrUrl}</p>
          </motion.div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <motion.div className="relative glass-modal dark:glass-modal-dark p-6 max-w-sm w-full" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <h3 className="font-display font-bold text-lg text-portal-ink dark:text-white mb-2">Delete Member?</h3>
            <p className="text-sm text-portal-label dark:text-portal-label mb-4">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-portal-line dark:border-white/10 text-sm font-medium text-portal-ink dark:text-portal-label hover:bg-portal-surface dark:hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg">Delete</button>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}
