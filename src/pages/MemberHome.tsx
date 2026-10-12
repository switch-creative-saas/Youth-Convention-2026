import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { bandColors as BAND_COLORS, groupColors as GROUP_COLORS } from '@/components/ui-kit/palette';

export function MemberHome() {
  const { conventionSettings, members, programmes } = useAppData();
  const { user } = useAuth();
  const member = members.find(m => m.email === user?.email) || members[0];
  const bandColor = BAND_COLORS[member.fellowshipBand];
  const groupColor = GROUP_COLORS[member.conventionGroup];

  const conventionDate = new Date(conventionSettings.startDate + 'T00:00:00');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const update = () => {
      const diff = conventionDate.getTime() - Date.now();
      if (diff <= 0) return;
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [conventionDate]);

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-[40px] font-light leading-[1.12] text-portal-ink [overflow-wrap:anywhere] lg:text-[48px]">Welcome back, {member.fullName.split(' ')[0]}</h2>
        <p className="mt-2 text-sm text-portal-label">Here&apos;s your convention overview</p>
      </motion.div>

      {programmes.filter(programme => programme.active).length > 0 && <motion.section className="portal-card p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <h3 className="mb-4 font-display text-base font-semibold text-portal-ink dark:text-white">Convention agenda</h3>
        <div className="space-y-3">
          {[...programmes].filter(programme => programme.active).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)).map(programme => <div key={programme.id} className="flex items-start justify-between gap-4 border-b border-portal-line pb-3 last:border-0 last:pb-0">
            <div><p className="text-sm font-medium text-portal-ink dark:text-white">{programme.title}</p>{programme.description && <p className="mt-1 text-xs text-portal-label">{programme.description}</p>}</div>
            <p className="shrink-0 text-right text-xs text-portal-label">{new Date(`${programme.date}T00:00:00`).toLocaleDateString()}<br />{programme.startTime} - {programme.endTime}</p>
          </div>)}
        </div>
      </motion.section>}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          className="rounded-2xl p-5 backdrop-blur-glass border bg-white/70 dark:bg-portal-surface border-white/45 dark:border-white/[0.08]"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface)' }}>
              <Users className="w-4 h-4" style={{ color: groupColor }} />
            </div>
            <span className="text-xs font-medium text-portal-label">My Group</span>
          </div>
          <p className="text-xl font-bold font-display" style={{ color: groupColor }}>{member.conventionGroup}</p>
        </motion.div>

        <motion.div
          className="rounded-2xl p-5 backdrop-blur-glass border bg-white/70 dark:bg-portal-surface border-white/45 dark:border-white/[0.08]"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface)' }}>
              <Calendar className="w-4 h-4" style={{ color: bandColor }} />
            </div>
            <span className="text-xs font-medium text-portal-label">My Band</span>
          </div>
          <p className="text-xl font-bold font-display" style={{ color: bandColor }}>{member.fellowshipBand}</p>
        </motion.div>
      </div>

      {/* Convention Card */}
      <motion.div
        className="rounded-3xl overflow-hidden relative"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        whileHover={{ y: -4 }}
      >
        <div className="absolute inset-0 bg-portal-dark" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80')] bg-cover bg-center mix-blend-overlay opacity-20" />
        <div className="relative z-10 p-6">
          <p className="text-white/70 text-xs uppercase tracking-wider font-medium">Upcoming Convention</p>
          <h3 className="font-display font-bold text-xl text-white mt-1">{conventionSettings.name}</h3>
          <p className="text-white/80 text-sm mt-1 italic">&ldquo;{conventionSettings.theme}&rdquo;</p>
          <div className="flex items-center gap-4 mt-4 text-white/70 text-xs">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(conventionSettings.startDate).toLocaleDateString()} - {new Date(conventionSettings.endDate).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {conventionSettings.location}</span>
          </div>

          {/* Countdown */}
          <div className="mt-5 grid grid-cols-4 gap-2 sm:max-w-sm sm:gap-3">
            {[
              { label: 'Days', value: timeLeft.days },
              { label: 'Hours', value: timeLeft.hours },
              { label: 'Mins', value: timeLeft.minutes },
              { label: 'Secs', value: timeLeft.seconds },
            ].map(unit => (
              <div key={unit.label} className="min-w-0">
                <div className="rounded-xl bg-white/10 px-1 py-2 text-center">
                  <p className="break-all font-mono text-lg font-bold text-white">{String(unit.value).padStart(2, '0')}</p>
                  <p className="text-[9px] text-white/60 uppercase">{unit.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Recent Updates */}
      <motion.div
        className="rounded-2xl p-5 backdrop-blur-glass border bg-white/70 dark:bg-portal-surface border-white/45 dark:border-white/[0.08]"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      >
        <h3 className="font-display font-semibold text-base text-portal-ink dark:text-white mb-4">Convention Updates</h3>
        <div className="space-y-3">
          {[
            { title: 'Opening Ceremony moved to 9:30 AM', time: '2 hours ago', icon: Clock },
            { title: 'New session: Youth Talent Show added', time: '5 hours ago', icon: Calendar },
            { title: 'Group A meeting scheduled for Friday', time: '1 day ago', icon: Users },
          ].map((update, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-portal-surface dark:bg-white/[0.03]">
              <update.icon className="w-4 h-4 text-portal-ink mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-portal-ink dark:text-portal-label">{update.title}</p>
                <p className="text-xs text-portal-label mt-0.5">{update.time}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
