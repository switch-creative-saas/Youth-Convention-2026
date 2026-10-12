import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldMinus, UserCog, Clock, Activity, Search } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { updateRegisteredAuthUserRole } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PillButton } from '@/components/ui-kit/PillButton';
import { PortalInput } from '@/components/ui-kit/FormControls';
import type { ConventionRoleName } from '@/types';

const CONVENTION_ROLE_LABELS: Record<ConventionRoleName, string> = {
  registration_desk: 'Registration desk',
  verification_operator: 'Verification operator',
  food_distributor: 'Food distributor',
  souvenir_distributor: 'Souvenir distributor',
  activity_coordinator: 'Activity coordinator',
  viewer: 'Viewer',
};

export function AdminAccessManagement() {
  const {
    executives,
    adminActivities,
    promoteExecutiveToAdmin,
    revokeExecutiveAdmin,
    conventionRoles,
    assignConventionRole,
    revokeConventionRole,
  } = useAppData();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');

  const actorEmail = user?.email ?? 'superadmin@mosyf.org';
  const actorName = user?.name ?? 'Super Admin';
  const filteredExecutives = executives.filter(exec =>
    !search ||
    exec.fullName.toLowerCase().includes(search.toLowerCase()) ||
    exec.email.toLowerCase().includes(search.toLowerCase()) ||
    exec.leadershipRole.toLowerCase().includes(search.toLowerCase())
  );
  const admins = executives.filter(exec => exec.registrationStatus === 'admin');

  const grantAccess = (executiveId: string) => {
    const executive = executives.find(exec => exec.id === executiveId);
    if (!executive) return;
    promoteExecutiveToAdmin(executiveId, actorEmail, actorName);
    updateRegisteredAuthUserRole(executive.email, 'admin');
    addToast({ type: 'success', title: `${executive.fullName} can now access the admin dashboard` });
  };

  const revokeAccess = (executiveId: string) => {
    const executive = executives.find(exec => exec.id === executiveId);
    if (!executive) return;
    revokeExecutiveAdmin(executiveId, actorEmail, actorName);
    updateRegisteredAuthUserRole(executive.email, 'executive');
    addToast({ type: 'warning', title: `${executive.fullName} admin access revoked` });
  };

  return (
    <AdminLayout
      pageTitle="Admin Access Management"
      pageSubtitle="Super admin control for executive registrations, admin promotion, revocation, and audit activity."
    >

      <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Executive Registrations', value: executives.length, icon: UserCog, tone: 'text-portal-ink bg-portal-surface' },
          { label: 'Active Admins', value: admins.length, icon: ShieldCheck, tone: 'text-portal-ink bg-portal-surface' },
          { label: 'Audit Events', value: adminActivities.length, icon: Activity, tone: 'text-portal-ink bg-portal-surface' },
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

      <div className="grid min-w-0 grid-cols-1 gap-6 2xl:grid-cols-[1.35fr_0.65fr]">
        <motion.div
          className="portal-card min-w-0 p-4 sm:p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-5 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white">Executive Registrations</h3>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-portal-label" />
              <PortalInput
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
                placeholder="Search executives..."
              />
            </div>
          </div>

          <div className="table-scroll">
            <table className="fit-table">
              <thead>
                <tr className="border-b border-portal-line dark:border-white/[0.06]">
                  {['Name', 'Leadership Role', 'Department', 'Band', 'Registration Status', 'Actions'].map(header => (
                    <th key={header} className="text-left text-xs font-medium uppercase tracking-[0.04em] text-portal-label pb-3 pr-4">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredExecutives.map((exec, index) => {
                  const isAdmin = exec.registrationStatus === 'admin';
                  return (
                    <motion.tr
                      key={exec.id}
                      className="border-b border-portal-line dark:border-white/[0.04]"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.025 }}
                    >
                      <td className="py-4 pr-4">
                        <div>
                          <p className="cell-truncate text-sm font-semibold text-portal-ink dark:text-white">{exec.fullName}</p>
                          <p className="cell-truncate text-xs text-portal-label">{exec.email}</p>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-sm text-portal-label dark:text-portal-label">{exec.leadershipRole}</td>
                      <td className="py-4 pr-4"><span className="status-badge-purple text-[10px]">{exec.department}</span></td>
                      <td className="py-4 pr-4"><span className="status-badge-blue text-[10px]">{exec.fellowshipBand}</span></td>
                      <td className="py-4 pr-4">
                        <span className={`${isAdmin ? 'status-badge-green' : 'status-badge-amber'} text-[10px]`}>
                          {isAdmin ? 'ADMIN' : 'EXECUTIVE'}
                        </span>
                      </td>
                      <td className="min-w-[180px] py-4">
                        {isAdmin ? (
                          <button onClick={() => revokeAccess(exec.id)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-red-500/10 px-3 text-xs font-medium text-red-500 hover:bg-red-500/20">
                            <ShieldMinus className="w-3.5 h-3.5" /> Revoke Admin Access
                          </button>
                        ) : (
                          <PillButton variant="outline" className="min-w-[164px] px-3 text-xs" onClick={() => grantAccess(exec.id)}>
                            <ShieldCheck className="w-3.5 h-3.5" /> Grant Admin Access
                          </PillButton>
                        )}
                        <select className="mt-2 min-h-9 w-full rounded-full border border-portal-line bg-transparent px-3 text-xs text-portal-ink" defaultValue="" onChange={event => {
                          const role = event.target.value as ConventionRoleName;
                          if (!role) return;
                          assignConventionRole(exec.email, role, actorEmail, actorName);
                          event.currentTarget.value = '';
                          addToast({ type: 'success', title: `${CONVENTION_ROLE_LABELS[role]} assigned to ${exec.fullName}` });
                        }}>
                          <option value="">Assign convention role</option>
                          {Object.entries(CONVENTION_ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
                        </select>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          className="portal-card min-w-0 p-4 sm:p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Admin Activity Audit</h3>
          <div className="space-y-4 max-h-[560px] overflow-y-auto scrollbar-thin">
            {(adminActivities.length ? adminActivities : [
              { id: 'empty', actorName: 'System', actorEmail: 'system', action: 'role' as const, target: 'No admin actions recorded yet', createdAt: new Date().toISOString() },
            ]).map(activity => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-portal-surface text-portal-ink flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-portal-ink dark:text-white">{activity.target}</p>
                  <p className="text-xs text-portal-label mt-1">{activity.actorName} - {new Date(activity.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.section className="portal-card mt-6 p-4 sm:p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <h3 className="mb-4 font-display text-lg font-semibold text-portal-ink dark:text-white">Convention roles</h3>
        {conventionRoles.length === 0 ? <p className="text-sm text-portal-label">No convention-specific roles have been assigned.</p> : <div className="grid gap-3 md:grid-cols-2">
          {conventionRoles.map(role => <div key={role.id} className="flex items-center justify-between gap-3 rounded-2xl border border-portal-line px-4 py-3"><div><p className="text-sm font-medium text-portal-ink dark:text-white">{CONVENTION_ROLE_LABELS[role.role]}</p><p className="text-xs text-portal-label">{role.userEmail}</p></div><button type="button" onClick={() => { revokeConventionRole(role.id, actorEmail, actorName); addToast({ type: 'success', title: 'Convention role revoked' }); }} className="rounded-full border border-portal-line px-3 py-1.5 text-xs text-portal-ink">Revoke</button></div>)}
        </div>}
      </motion.section>
    </AdminLayout>
  );
}
