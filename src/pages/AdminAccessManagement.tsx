import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, UserCog, Clock, Activity, Building2, Plus } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PillButton } from '@/components/ui-kit/PillButton';
import { PortalInput, PortalSelect, formLabelClass } from '@/components/ui-kit/FormControls';
import { formatDateTime } from '@/lib/format';
import { InviteLinkDialog } from '@/components/InviteLinkDialog';
import type { InviteResult } from '@/lib/api';
import { WORKSPACE_ROLE_LABELS, roleOptionLabel, type WorkspaceRole } from '@/types';

// Admin = full access to this workspace; the rest are limited staff roles.
const ROLE_OPTIONS = Object.keys(WORKSPACE_ROLE_LABELS) as WorkspaceRole[];

export function AdminAccessManagement() {
  const { workspaces, currentWorkspace, workspaceMembers, adminActivities, inviteStaff, revokeRole, createWorkspace } = useAppData();
  const { isPlatformAdmin, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [staffName, setStaffName] = useState('');
  const [shareLink, setShareLink] = useState<{ email: string; link: string } | null>(null);
  const [role, setRole] = useState<WorkspaceRole>('registration_desk');
  const [busy, setBusy] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState({ name: '', slug: '', ownerEmail: '', ownerName: '', codePrefix: 'MOSYF' });

  const admins = workspaceMembers.filter(member => member.role === 'admin');

  const run = async (action: () => Promise<void>, success: string, failure: string) => {
    setBusy(true);
    try {
      await action();
      if (success) addToast({ type: 'success', title: success });
    } catch (error) {
      addToast({ type: 'error', title: failure, description: error instanceof Error ? error.message : undefined, duration: 7000 });
    } finally {
      setBusy(false);
    }
  };

  /** Tells the admin what happened: emailed invite, existing login, or a link to share by hand. */
  const reportInvite = (target: string, result: InviteResult, what: string) => {
    if (result.status === 'link' && result.actionLink) {
      setShareLink({ email: target, link: result.actionLink });
      return;
    }
    addToast({
      type: 'success',
      title: what,
      description: result.status === 'invited' ? `An invite email was sent to ${target} to set their password.` : `${target} already has a login and can sign in now.`,
      duration: 7000,
    });
  };

  const submitRole = (event: React.FormEvent) => {
    event.preventDefault();
    const target = email.trim().toLowerCase();
    if (!target) return;
    void run(async () => {
      const result = await inviteStaff(target, role, staffName.trim() || undefined);
      setEmail(''); setStaffName('');
      reportInvite(target, result, `${WORKSPACE_ROLE_LABELS[role]} access given to ${target}`);
    }, '', 'Could not give access');
  };

  const submitWorkspace = (event: React.FormEvent) => {
    event.preventDefault();
    const target = workspaceForm.ownerEmail.trim().toLowerCase();
    void run(async () => {
      const result = await createWorkspace({
        name: workspaceForm.name.trim(),
        slug: workspaceForm.slug.trim().toLowerCase(),
        ownerEmail: target,
        ownerName: workspaceForm.ownerName.trim() || undefined,
        codePrefix: workspaceForm.codePrefix.trim().toUpperCase(),
      });
      await refreshProfile();
      setWorkspaceForm({ name: '', slug: '', ownerEmail: '', ownerName: '', codePrefix: 'MOSYF' });
      reportInvite(target, result, `Workspace created for ${target}`);
    }, '', 'Could not create workspace');
  };

  return (
    <AdminLayout pageTitle="Access Management" pageSubtitle="Who can sign in to this workspace, what they can do, and an audit of recent actions." requiresEvent={false}>
      <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Workspace Staff', value: new Set(workspaceMembers.map(member => member.userId)).size, icon: UserCog },
          { label: 'Admins', value: admins.length, icon: ShieldCheck },
          { label: 'Audit Events', value: adminActivities.length, icon: Activity },
        ].map((item, index) => (
          <motion.div key={item.label} className="rounded-[20px] p-5 backdrop-blur-glass border bg-white/70 dark:bg-portal-surface border-white/45 dark:border-white/[0.08]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-portal-ink bg-portal-surface"><item.icon className="w-5 h-5" /></div>
            <p className="font-mono text-3xl font-bold text-portal-ink dark:text-white mt-4">{item.value}</p>
            <p className="text-xs text-portal-label mt-1">{item.label}</p>
          </motion.div>
        ))}
      </div>

      {isPlatformAdmin && (
        <motion.section className="portal-card mb-6 p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-4 flex items-center gap-2"><Building2 className="h-5 w-5 text-portal-ink" /><h3 className="font-display text-lg font-semibold text-portal-ink dark:text-white">Workspaces</h3></div>
          <p className="mb-4 max-w-3xl text-sm text-portal-label">Each workspace is a separate, empty dashboard for one admin. Enter their email and they'll be invited to set a password (an existing login is simply given access).</p>
          <form onSubmit={submitWorkspace} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1.2fr_1fr_0.6fr_auto] xl:items-end">
            <div><label className={formLabelClass}>Workspace name</label><PortalInput required value={workspaceForm.name} onChange={e => setWorkspaceForm({ ...workspaceForm, name: e.target.value, slug: workspaceForm.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} placeholder="e.g. Lagos Youth Fellowship" /></div>
            <div><label className={formLabelClass}>Slug (public status URL)</label><PortalInput required pattern="[a-z0-9][a-z0-9-]{1,48}[a-z0-9]" value={workspaceForm.slug} onChange={e => setWorkspaceForm({ ...workspaceForm, slug: e.target.value.toLowerCase() })} placeholder="lagos-youth" /></div>
            <div><label className={formLabelClass}>Admin email</label><PortalInput required type="email" value={workspaceForm.ownerEmail} onChange={e => setWorkspaceForm({ ...workspaceForm, ownerEmail: e.target.value })} placeholder="admin@example.com" /></div>
            <div><label className={formLabelClass}>Admin name</label><PortalInput value={workspaceForm.ownerName} onChange={e => setWorkspaceForm({ ...workspaceForm, ownerName: e.target.value })} placeholder="Optional" /></div>
            <div><label className={formLabelClass}>ID prefix</label><PortalInput required pattern="[A-Za-z0-9]{2,10}" value={workspaceForm.codePrefix} onChange={e => setWorkspaceForm({ ...workspaceForm, codePrefix: e.target.value.toUpperCase() })} /></div>
            <PillButton variant="dark" type="submit" disabled={busy}><Plus className="h-4 w-4" /> Create</PillButton>
          </form>
          {workspaces.length > 0 && (
            <div className="mt-5 grid gap-2 md:grid-cols-2">
              {workspaces.map(ws => (
                <div key={ws.id} className={`rounded-2xl border px-4 py-3 ${ws.id === currentWorkspace?.id ? 'border-portal-dark' : 'border-portal-line'}`}>
                  <p className="text-sm font-medium text-portal-ink dark:text-white">{ws.name}</p>
                  <p className="text-xs text-portal-label">/{ws.slug} · IDs {ws.codePrefix}-YYYY-0001{ws.isActive ? '' : ' · inactive'}</p>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      )}

      {currentWorkspace && (
        <div className="grid min-w-0 grid-cols-1 gap-6 2xl:grid-cols-[1.35fr_0.65fr]">
          <motion.div className="portal-card min-w-0 p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white">Staff of {currentWorkspace.name}</h3>
            <p className="mt-1 text-sm text-portal-label">Enter an email and role. New people get an invite email to set their password; people who already have a login get the role straight away.</p>

            <form onSubmit={submitRole} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_220px_auto] lg:items-end">
              <div><label className={formLabelClass}>Email</label><PortalInput type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@example.com" /></div>
              <div><label className={formLabelClass}>Name</label><PortalInput value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="Optional" /></div>
              <div><label className={formLabelClass}>Role</label>
                <PortalSelect value={role} onChange={e => setRole(e.target.value as WorkspaceRole)}>
                  {ROLE_OPTIONS.map(option => <option key={option} value={option}>{roleOptionLabel(option)}</option>)}
                </PortalSelect>
              </div>
              <PillButton variant="dark" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Give access'}</PillButton>
            </form>

            <div className="mt-6 space-y-3">
              {workspaceMembers.length === 0 && <p className="text-sm text-portal-label">No staff assigned yet.</p>}
              {workspaceMembers.map(member => {
                // The workspace owner's admin role can only be removed by the platform owner.
                const locked = member.role === 'admin' && member.userId === currentWorkspace.ownerId && !isPlatformAdmin;
                return (
                  <div key={`${member.userId}-${member.role}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-portal-line px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-portal-ink dark:text-white">{member.name}</p>
                      <p className="truncate text-xs text-portal-label">{member.email} · since {formatDateTime(member.assignedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`${member.role === 'admin' ? 'status-badge-green' : 'status-badge-blue'} text-[10px]`}>{WORKSPACE_ROLE_LABELS[member.role]}</span>
                      {!locked && (
                        <button type="button" disabled={busy} onClick={() => void run(() => revokeRole(member.userId, member.role), 'Role revoked', 'Could not revoke role')} className="rounded-full border border-portal-line px-3 py-1.5 text-xs text-portal-ink disabled:opacity-60">Revoke</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div className="portal-card min-w-0 p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Activity Audit</h3>
            <div className="space-y-4 max-h-[560px] overflow-y-auto scrollbar-thin">
              {adminActivities.length === 0 && <p className="text-sm text-portal-label">No actions recorded yet.</p>}
              {adminActivities.map(activity => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-portal-surface text-portal-ink flex items-center justify-center shrink-0"><Clock className="w-4 h-4" /></div>
                  <div>
                    <p className="text-sm font-medium text-portal-ink dark:text-white">{activity.target}</p>
                    <p className="text-xs text-portal-label mt-1">{activity.actorName} - {formatDateTime(activity.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
      {shareLink && <InviteLinkDialog email={shareLink.email} link={shareLink.link} onClose={() => setShareLink(null)} />}
    </AdminLayout>
  );
}
