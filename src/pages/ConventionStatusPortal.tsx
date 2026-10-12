import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, CalendarDays, Check, Clock, Gift, Search, ShieldCheck, Ticket, Trophy, Utensils, XCircle } from 'lucide-react';
import { ExecutiveConventionTag, ConventionTag } from '@/components/ConventionTag';
import { AttendeePortalLayout } from '@/components/attendee/AttendeePortalLayout';
import { useAppData } from '@/contexts/AppDataContext';
import type { AccessItemType, Executive, Member } from '@/types';

const activityNames = ['Sports', 'Bible Quiz', 'Drama Competition', 'Music Night', 'Leadership Workshop'];

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function formatDateTime(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function claimTime(claims: Partial<Record<AccessItemType, string>> | undefined, item: AccessItemType) {
  return claims?.[item];
}

function Countdown({ date }: { date: string }) {
  const target = useMemo(() => new Date(date + 'T00:00:00').getTime(), [date]);
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        ['Days', days],
        ['Hours', hours],
        ['Minutes', minutes],
      ].map(([label, value]) => (
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

function AttendeePass({ type, attendee }: { type: 'member'; attendee: Member } | { type: 'executive'; attendee: Executive }) {
  const { conventionSettings, attendance } = useAppData();
  const isMember = type === 'member';
  const claims = attendee.accessClaims;
  const attendanceRecord = attendance.find(record => record.memberId === attendee.id);
  const biometricVerified = isMember && attendee.biometricStatus === 'verified_checked_in';
  const adminApproved = !isMember && attendee.registrationStatus === 'admin';
  const group = isMember ? attendee.conventionGroup : 'Executive';

  return (
    <AttendeePortalLayout token={attendee.statusToken} darkSurface>
        <div className="mx-auto max-w-5xl">
          <motion.div
            className="relative overflow-hidden rounded-[32px] border border-white/10 bg-portal-surface p-5 shadow-[0_28px_90px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="absolute inset-0 bg-portal-surface" />
            <div className="relative z-10 grid gap-8 lg:grid-cols-[0.82fr_1fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-portal-ink">Mountain of Solution Youth Fellowship</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight">Convention 2026</h1>
                <p className="mt-4 text-lg font-semibold">Hello, {firstName(attendee.fullName)}.</p>
                <p className="mt-2 text-sm leading-6 text-portal-label">You're registered for MOSYF Convention 2026. This digital event pass updates as convention activity is recorded.</p>

                <div className="mt-6 rounded-3xl border border-white/10 bg-portal-surface p-4">
                  <Countdown date={conventionSettings.startDate} />
                  <div className="mt-5 grid gap-3 text-sm text-portal-label">
                    <p><CalendarDays className="mr-2 inline h-4 w-4 text-portal-ink" /> {new Date(conventionSettings.startDate).toLocaleDateString()} - {new Date(conventionSettings.endDate).toLocaleDateString()}</p>
                    <p><Ticket className="mr-2 inline h-4 w-4 text-portal-ink" /> {conventionSettings.location}</p>
                    <p><Clock className="mr-2 inline h-4 w-4 text-portal-ink" /> Opens 9:00 AM daily</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] bg-portal-surface p-4 text-portal-ink">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-3xl bg-portal-surface">
                    {attendee.profilePhoto ? <img src={attendee.profilePhoto} alt={attendee.fullName} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-2xl font-black">{attendee.fullName.slice(0, 2).toUpperCase()}</div>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-2xl font-black">{attendee.fullName}</p>
                    <p className="font-mono text-sm text-portal-ink">{attendee.id}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusPill complete label="Registered" />
                      {!isMember && <StatusPill complete={adminApproved} label={adminApproved ? 'Admin Approved' : 'Awaiting Approval'} />}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <Info label={isMember ? 'Band' : 'Role'} value={isMember ? attendee.fellowshipBand : attendee.leadershipRole} />
                  <Info label="Department" value={isMember ? attendee.departments.join(', ') : attendee.department} />
                  <Info label="Group" value={group} />
                  <Info label="Status" value={biometricVerified ? 'Biometric Verified' : adminApproved ? 'Admin Approved' : 'Registered'} />
                </div>
              </div>
            </div>
          </motion.div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="rounded-[28px] border border-portal-line bg-portal-surface p-5 text-portal-ink shadow-xl dark:border-white/10 dark:bg-portal-surface dark:text-portal-ink sm:p-6">
              <h2 className="mb-5 text-xl font-black">Convention Status Timeline</h2>
              <div className="space-y-4">
                <TimelineItem complete title="Registration Completed" detail={formatDateTime(attendee.registeredAt)} icon={BadgeCheck} />
                <TimelineItem complete title="Convention Tag Generated" detail="Official MOSYF event pass is available." icon={Ticket} />
                {!isMember && <TimelineItem complete={adminApproved} title="Admin Approval" detail={adminApproved ? formatDateTime(attendee.adminGrantedAt) : 'Waiting for admin approval.'} icon={ShieldCheck} />}
                <TimelineItem complete={biometricVerified} title="Biometric Verification" detail={biometricVerified ? formatDateTime((attendee as Member).lastVerifiedAt) : 'Fingerprint data is never shown here.'} icon={ShieldCheck} />
                <TimelineItem complete={Boolean(attendanceRecord)} title="Convention Attendance" detail={attendanceRecord ? formatDateTime(attendanceRecord.checkInTime) : 'Not checked in yet.'} icon={Check} />
                <TimelineItem complete={Boolean(claimTime(claims, 'food'))} title="Food Collection" detail={formatDateTime(claimTime(claims, 'food')) || 'Not collected yet.'} icon={Utensils} />
                <TimelineItem complete={Boolean(claimTime(claims, 'souvenir'))} title="Souvenir Collection" detail={formatDateTime(claimTime(claims, 'souvenir')) || 'Not collected yet.'} icon={Gift} />
                <TimelineItem complete={Boolean(claimTime(claims, 'activity'))} title="Activity Participation" detail={formatDateTime(claimTime(claims, 'activity')) || 'No activity participation recorded yet.'} icon={Trophy} />
              </div>

              <h3 className="mt-8 mb-4 text-lg font-black">Activities</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {activityNames.map((activity, index) => {
                  const participated = index === 0 && Boolean(claimTime(claims, 'activity'));
                  return (
                    <div key={activity} className="rounded-2xl border border-portal-line bg-portal-surface p-4 dark:border-white/10 dark:bg-portal-surface">
                      <p className="font-bold">{activity}</p>
                      <p className={`mt-2 text-xs font-bold uppercase ${participated ? 'text-portal-ink' : 'text-portal-label'}`}>{participated ? 'Participated' : 'Not Participated'}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-portal-line bg-portal-surface p-5 shadow-xl dark:border-white/10 dark:bg-portal-surface">
              <h2 className="mb-4 text-xl font-black text-portal-ink dark:text-portal-ink">Official Tag</h2>
              {isMember ? <ConventionTag member={attendee} /> : <ExecutiveConventionTag executive={attendee} />}
              <button onClick={() => window.print()} className="mt-4 w-full rounded-2xl bg-portal-dark px-5 py-3 text-sm font-bold text-white">
                Print Convention Tag
              </button>
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

export function ConventionStatusPortal() {
  const { token } = useParams();
  const { findAttendeeByStatusToken } = useAppData();
  const result = findAttendeeByStatusToken(token);

  if (!result) {
    return (
      <AttendeePortalLayout compact>
        <div className="max-w-md rounded-[28px] border border-white/10 bg-portal-surface p-8 text-center backdrop-blur-xl">
          <XCircle className="mx-auto h-12 w-12 text-red-300" />
          <h1 className="mt-5 text-2xl font-black">Status Link Not Found</h1>
          <p className="mt-3 text-sm leading-6 text-portal-label">This convention status link is invalid or has expired.</p>
          <Link to="/convention/status" className="mt-6 inline-flex rounded-2xl bg-portal-surface px-5 py-3 text-sm font-bold text-portal-ink">Search Status</Link>
        </div>
      </AttendeePortalLayout>
    );
  }

  return <AttendeePass type={result.type} attendee={result.attendee as never} />;
}

export function ConventionStatusSearchPage() {
  const { members, executives } = useAppData();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const results = normalized.length > 1
    ? [
        ...members.filter(member => member.id.toLowerCase().includes(normalized) || member.fullName.toLowerCase().includes(normalized)).map(member => ({ type: 'member' as const, attendee: member })),
        ...executives.filter(exec => exec.id.toLowerCase().includes(normalized) || exec.fullName.toLowerCase().includes(normalized)).map(exec => ({ type: 'executive' as const, attendee: exec })),
      ].slice(0, 8)
    : [];

  return (
    <AttendeePortalLayout compact>
        <h1 className="text-4xl font-black tracking-tight">Check your MOSYF Convention status</h1>
        <p className="mt-3 text-portal-label dark:text-portal-label">Search by member ID, executive ID, or name. Results show limited convention status only.</p>
        <div className="relative mt-8">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-portal-label" />
          <input value={query} onChange={event => setQuery(event.target.value)} className="glass-input h-14 w-full rounded-2xl pl-12" placeholder="Enter Member ID or name" />
        </div>
        <div className="mt-5 space-y-3">
          {results.map(({ type, attendee }) => (
            <Link key={attendee.id} to={`/convention/status/${attendee.statusToken}`} className="block rounded-2xl border border-portal-line bg-portal-surface p-4 shadow-sm transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-portal-surface">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black">{attendee.fullName}</p>
                  <p className="font-mono text-sm text-portal-ink dark:text-portal-ink">{attendee.id}</p>
                </div>
                <StatusPill complete label={type === 'executive' && attendee.registrationStatus === 'admin' ? 'Admin Approved' : 'Registered'} />
              </div>
            </Link>
          ))}
        </div>
    </AttendeePortalLayout>
  );
}
