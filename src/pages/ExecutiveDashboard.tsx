import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Pencil, CheckCircle, Clock, Printer, ShieldCheck } from 'lucide-react';
import { ExecutiveConventionTag } from '@/components/ConventionTag';
import { ExecutiveLayout } from '@/components/ExecutiveLayout';
import { PhotoCard } from '@/components/ui-kit/PhotoCard';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';

export function ExecutiveDashboard() {
  const { user } = useAuth();
  const { conventionSettings, executives, programmes } = useAppData();
  const { addToast } = useToast();
  const reducedMotion = useReducedMotion();
  const [showEditModal, setShowEditModal] = useState(false);
  const exec = executives.find(e => e.email === user?.email) || executives[0];
  const sessions = conventionSettings.sessions.map(session => {
    const now = new Date();
    const starts = new Date(`${session.date}T${session.startTime}`);
    const ends = new Date(`${session.date}T${session.endTime}`);
    return { ...session, status: now > ends ? 'past' : now >= starts ? 'current' : 'upcoming' };
  });
  const detailItems = [
    ['Leadership role', exec.leadershipRole], ['Department', exec.department], ['Fellowship band', exec.fellowshipBand],
    ['Phone', exec.phoneNumber], ['Email', exec.email], ['Member since', new Date(exec.registeredAt).toLocaleDateString()],
  ];

  return <ExecutiveLayout>
    <div className="grid min-w-0 gap-6 lg:grid-cols-12">
      <motion.aside className="space-y-6 lg:col-span-4" initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <PhotoCard
          src={exec.profilePhoto}
          name={exec.fullName}
          subtitle={exec.leadershipRole}
          badges={<><span>{exec.fellowshipBand}</span><span className={exec.registrationStatus === 'admin' ? 'bg-white/15' : 'border-portal-accent !bg-portal-accent !text-portal-accent-ink'}>{exec.registrationStatus === 'admin' ? 'Admin Approved' : 'Awaiting Approval'}</span></>}
        />
        <section className="portal-card rounded-[28px] p-5">
          <p className="text-xs font-medium text-portal-label">Your Convention Group</p>
          <p className="mt-1 text-3xl font-light text-portal-ink">Group A</p>
          <p className="mt-3 text-sm leading-6 text-portal-label">You will participate in sports, games, and activities with your group members.</p>
        </section>
      </motion.aside>

      <div className="min-w-0 space-y-6 lg:col-span-8">
        <motion.section className="portal-card rounded-[28px] p-5 sm:p-6" initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: reducedMotion ? 0 : 0.04 }}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-medium text-portal-ink">Executive details</h2><button onClick={() => setShowEditModal(true)} className="portal-focus inline-flex min-h-11 items-center gap-2 rounded-full border border-portal-line px-4 text-sm text-portal-ink"><Pencil className="h-4 w-4" />Edit Profile</button></div>
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{detailItems.map(([label, value]) => <div key={label}><dt className="text-xs text-portal-label">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-portal-ink">{value}</dd></div>)}</dl>
        </motion.section>

        <motion.section className="portal-card min-w-0 rounded-[28px] p-5 sm:p-6" initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: reducedMotion ? 0 : 0.08 }}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-medium text-portal-ink">Executive Convention Tag</h2><p className="mt-1 text-sm text-portal-label">Uses the official MOSYF convention tag system.</p></div><span className="rounded-full bg-portal-accent px-3 py-1.5 text-xs font-medium text-portal-accent-ink"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />{exec.registrationStatus === 'admin' ? 'Admin Approved' : 'Awaiting Approval'}</span></div>
          <div className="mx-auto flex min-h-[620px] max-w-[500px] items-center justify-center overflow-visible"><ExecutiveConventionTag executive={exec} /></div>
          <button onClick={() => window.print()} className="portal-focus mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-portal-line px-4 text-sm text-portal-ink"><Printer className="h-4 w-4" />Print Tag</button>
        </motion.section>

        {programmes.filter(programme => programme.active).length > 0 && <motion.section className="portal-card rounded-[28px] p-5 sm:p-6" initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: reducedMotion ? 0 : 0.12 }}>
          <h2 className="mb-4 text-xl font-medium text-portal-ink">Convention agenda</h2>
          <div className="space-y-3">{[...programmes].filter(programme => programme.active).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)).map(programme => <div key={programme.id} className="flex items-start justify-between gap-4 border-b border-portal-line pb-3 last:border-0 last:pb-0"><div><p className="text-sm font-medium text-portal-ink">{programme.title}</p><p className="mt-1 text-xs text-portal-label">{programme.location}</p></div><p className="shrink-0 text-right text-xs text-portal-label">{new Date(`${programme.date}T00:00:00`).toLocaleDateString()}<br />{programme.startTime} - {programme.endTime}</p></div>)}</div>
        </motion.section>}
      </div>

      <motion.section className="portal-card rounded-[28px] p-5 sm:p-6 lg:col-span-7" initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: reducedMotion ? 0 : 0.1 }}>
        <h2 className="mb-5 text-xl font-medium text-portal-ink">Convention Schedule</h2><div className="space-y-4">{sessions.map(session => <div key={session.id} className="flex gap-3 border-b border-portal-line pb-4 last:border-0 last:pb-0"><span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${session.status === 'current' ? 'bg-portal-accent' : session.status === 'past' ? 'bg-portal-dark' : 'border border-portal-line'}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-portal-ink">{session.name}{session.status === 'current' && <span className="ml-2 rounded-full bg-portal-accent px-2 py-0.5 text-[10px] text-portal-accent-ink">Happening Now</span>}</p><p className="mt-1 text-xs text-portal-label">{new Date(session.date).toLocaleDateString()} · {session.startTime} - {session.endTime} · {session.venue}</p></div>{session.status === 'past' ? <CheckCircle className="h-4 w-4 text-portal-label" /> : session.status === 'current' ? <Clock className="h-4 w-4 text-portal-accent-ink" /> : null}</div>)}</div>
      </motion.section>
      <section className="portal-card rounded-[28px] p-5 sm:p-6 lg:col-span-5"><h2 className="mb-5 text-xl font-medium text-portal-ink">My Fellowship Information</h2><dl className="space-y-4"><div className="flex justify-between gap-3"><dt className="text-sm text-portal-label">Fellowship band</dt><dd className="portal-tag">{exec.fellowshipBand}</dd></div><div className="flex justify-between gap-3"><dt className="text-sm text-portal-label">Department</dt><dd className="portal-tag">{exec.department}</dd></div><div className="flex justify-between gap-3"><dt className="text-sm text-portal-label">Church Branch</dt><dd className="text-sm font-medium text-portal-ink">Main Branch</dd></div></dl></section>
    </div>

    {showEditModal && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><button aria-label="Close edit profile" className="absolute inset-0 bg-black/40" onClick={() => setShowEditModal(false)} /><motion.div className="portal-card relative w-full max-w-sm rounded-[28px] p-6" initial={reducedMotion ? false : { scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }}><h2 className="mb-4 text-lg font-medium text-portal-ink">Edit Profile</h2><div className="space-y-3"><label className="block text-xs text-portal-label">Full Name<input className="glass-input mt-1 w-full" defaultValue={exec.fullName} /></label><label className="block text-xs text-portal-label">Phone<input className="glass-input mt-1 w-full" defaultValue={exec.phoneNumber} /></label><label className="block text-xs text-portal-label">Email<input className="glass-input mt-1 w-full" defaultValue={exec.email} /></label><label className="block text-xs text-portal-label">Address<textarea className="glass-input mt-1 min-h-[60px] w-full" defaultValue={exec.address} /></label></div><div className="mt-5 flex gap-3"><button onClick={() => setShowEditModal(false)} className="min-h-11 flex-1 rounded-full border border-portal-line text-sm text-portal-ink">Cancel</button><button onClick={() => { setShowEditModal(false); addToast({ type: 'success', title: 'Profile updated!' }); }} className="min-h-11 flex-1 rounded-full bg-portal-dark text-sm text-white">Save</button></div></motion.div></div>}
  </ExecutiveLayout>;
}
