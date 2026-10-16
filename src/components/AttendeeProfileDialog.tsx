import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { formatBirthday, formatDateOfBirth, formatDateTime, initials } from '@/lib/format';
import { statusUrl } from '@/lib/supabase';
import type { Attendee } from '@/types';

const BIOMETRIC_LABELS: Record<Attendee['biometricStatus'], string> = {
  pending_verification: 'Pending verification',
  fingerprint_enrolled: 'Fingerprint enrolled',
  verified_checked_in: 'Biometric verified',
  duplicate_attempt: 'Duplicate attempt detected',
};

function Field({ label, value, wide = false }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl bg-portal-surface px-4 py-3 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-portal-label">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-portal-ink dark:text-white">{value || '—'}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-portal-label">{title}</h4>
      <dl className="grid gap-2 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

/**
 * Everything an attendee filled in at registration. Birthdays show the day and month only, except
 * to the platform owner, who sees the full date of birth. Admins can change the group and departments.
 */
export function AttendeeProfileDialog({ attendee, onClose }: { attendee: Attendee; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isMember = attendee.kind === 'member';
  const claims = attendee.accessClaims;
  const { churchGroups, departments, updateAttendee, setAttendeeDepartments } = useAppData();
  const { isPlatformAdmin } = useAuth();
  const [departmentDraft, setDepartmentDraft] = useState<string[] | null>(null);
  const [savingDepartments, setSavingDepartments] = useState(false);
  const selectedDepartments = departmentDraft ?? attendee.departmentIds;
  const departmentsChanged = departmentDraft !== null && (departmentDraft.length !== attendee.departmentIds.length || departmentDraft.some(id => !attendee.departmentIds.includes(id)));

  const toggleDepartment = (id: string) => setDepartmentDraft(current => {
    const base = current ?? attendee.departmentIds;
    return base.includes(id) ? base.filter(item => item !== id) : [...base, id];
  });

  const saveDepartments = async () => {
    if (!departmentDraft) return;
    setSavingDepartments(true);
    try {
      await setAttendeeDepartments(attendee, departmentDraft);
      setDepartmentDraft(null);
      addToast({ type: 'success', title: 'Departments updated', description: 'Their tag and status page show the new departments.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Could not update departments', description: error instanceof Error ? error.message : undefined });
    } finally {
      setSavingDepartments(false);
    }
  };
  const canManage = usePermission('manage');
  const { addToast } = useToast();
  const [savingGroup, setSavingGroup] = useState(false);

  const changeGroup = async (groupId: string) => {
    setSavingGroup(true);
    try {
      await updateAttendee(attendee.id, { groupId: groupId || null });
      addToast({ type: 'success', title: 'Group updated', description: 'Their tag and status page show the new group.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Could not change the group', description: error instanceof Error ? error.message : undefined });
    } finally {
      setSavingGroup(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${attendee.fullName} profile`}
        className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl dark:bg-portal-surface sm:rounded-[28px] sm:p-7"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={onClose} aria-label="Close profile" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-portal-line text-portal-label hover:text-portal-ink">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-4 pr-12">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-3xl bg-portal-surface">
            {attendee.profilePhoto
              ? <img src={attendee.profilePhoto} alt={attendee.fullName} className="h-full w-full object-cover" />
              : <div className="grid h-full w-full place-items-center text-2xl font-black text-portal-ink">{initials(attendee.fullName)}</div>}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold text-portal-ink dark:text-white">{attendee.fullName}</h3>
            <p className="font-mono text-sm text-portal-label">{attendee.code}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={`${isMember ? 'status-badge-blue' : 'status-badge-purple'} text-[10px]`}>{isMember ? 'Member' : 'Executive'}</span>
              {attendee.isFirstTimer && <span className="status-badge-amber text-[10px]">First timer</span>}
            </div>
          </div>
        </div>

        <Section title="Personal">
          <Field label="Gender" value={attendee.gender} />
          {isPlatformAdmin
            ? <Field label="Date of birth" value={formatDateOfBirth(attendee.dateOfBirth)} />
            : <Field label="Birthday" value={formatBirthday(attendee.dateOfBirth)} />}
          <Field label="Occupation" value={attendee.occupation} />
          <Field label="Church branch" value={attendee.churchBranch} />
          <Field label="Address" value={attendee.address} wide />
        </Section>

        <Section title="Contact">
          <Field label="Phone" value={attendee.phoneNumber} />
          <Field label="Email" value={attendee.email} />
          <Field label="Emergency contact" value={attendee.emergencyContact} wide />
        </Section>

        <Section title="Convention">
          {isMember ? <Field label="Band" value={attendee.fellowshipBand} /> : <Field label="Leadership role" value={attendee.leadershipRole} />}
          {canManage ? (
            <div className="min-w-0 rounded-2xl bg-portal-surface px-4 py-3">
              <label htmlFor="profile-group" className="text-[10px] font-bold uppercase tracking-[0.14em] text-portal-label">Group</label>
              <select
                id="profile-group"
                value={attendee.groupId ?? ''}
                disabled={savingGroup}
                onChange={event => void changeGroup(event.target.value)}
                className="portal-focus mt-1 w-full rounded-lg border border-portal-line bg-transparent px-2 py-1.5 text-sm font-medium text-portal-ink disabled:opacity-60 dark:text-white"
              >
                <option value="">No group</option>
                {churchGroups.filter(group => group.active || group.id === attendee.groupId).map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </div>
          ) : <Field label="Group" value={attendee.conventionGroup} />}
          {canManage ? (
            <div className="min-w-0 rounded-2xl bg-portal-surface px-4 py-3 sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-portal-label">Departments</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {departments.filter(item => item.active || attendee.departmentIds.includes(item.id)).map(item => {
                  const selected = selectedDepartments.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={savingDepartments}
                      onClick={() => toggleDepartment(item.id)}
                      className={`min-h-9 rounded-full border px-3 text-xs font-medium disabled:opacity-60 ${selected ? 'border-portal-dark bg-portal-dark text-white' : 'border-portal-line text-portal-ink dark:text-white'}`}
                    >
                      {item.name}
                    </button>
                  );
                })}
                {departments.length === 0 && <span className="text-sm text-portal-label">Add departments on the Convention page first.</span>}
              </div>
              {departmentsChanged && (
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={savingDepartments} onClick={() => void saveDepartments()} className="min-h-9 rounded-full bg-portal-dark px-4 text-xs font-medium text-white disabled:opacity-60">{savingDepartments ? 'Saving…' : 'Save departments'}</button>
                  <button type="button" disabled={savingDepartments} onClick={() => setDepartmentDraft(null)} className="min-h-9 rounded-full border border-portal-line px-4 text-xs font-medium text-portal-ink dark:text-white">Cancel</button>
                </div>
              )}
            </div>
          ) : <Field label="Departments" value={attendee.departments.join(', ')} wide />}
          {isMember && attendee.isFirstTimer && (
            <>
              <Field label="Invited by" value={attendee.invitedBy} />
              <Field label="Wants permanent membership" value={attendee.wantsPermanentMembership === null ? '' : attendee.wantsPermanentMembership ? 'Yes' : 'No'} />
              <Field label="Followed up" value={attendee.firstTimerFollowedUp ? 'Yes' : 'No'} />
            </>
          )}
        </Section>

        <Section title="Status">
          <Field label="Registered" value={formatDateTime(attendee.registeredAt)} />
          <Field label="Biometric" value={BIOMETRIC_LABELS[attendee.biometricStatus]} />
          <Field label="Food" value={claims.food ? `Collected ${formatDateTime(claims.food)}` : 'Pending'} />
          <Field label="Souvenir" value={claims.souvenir ? `Collected ${formatDateTime(claims.souvenir)}` : 'Pending'} />
          <Field label="Confirmation email" value={attendee.confirmationEmailSentAt ? `Sent ${formatDateTime(attendee.confirmationEmailSentAt)}` : attendee.confirmationEmailError ? `Failed: ${attendee.confirmationEmailError}` : 'Not sent'} />
          <Field label="Timetable email" value={attendee.timetableEmailSentAt ? `Sent ${formatDateTime(attendee.timetableEmailSentAt)}` : 'Not sent'} />
        </Section>

        <a href={statusUrl(attendee.statusToken)} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-portal-line px-5 text-sm font-medium text-portal-ink">
          <ExternalLink className="h-4 w-4" /> Open their status page
        </a>
      </motion.div>
    </div>
  );
}
