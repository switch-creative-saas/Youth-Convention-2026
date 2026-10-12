import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { StatCard } from '@/components/StatCard';
import { Users, Shield, UserCheck, Activity } from 'lucide-react';
import { portalChartAxis, portalChartPalette, portalChartTooltip } from '@/components/ui-kit/chartTheme';

export function AdminAnalytics() {
  const { members, executives, attendance, firstTimers } = useAppData();

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const maleCount = members.filter(m => m.gender === 'Male').length;
  const femaleCount = members.filter(m => m.gender === 'Female').length;
  const ftTotal = firstTimers.length;
  const ftWantMembership = firstTimers.filter(ft => ft.wantsPermanentMembership).length;
  const ftFollowedUp = firstTimers.filter(ft => ft.followedUp).length;

  const attendanceTrend = [
    { day: 'Mon', count: 32 },
    { day: 'Tue', count: 45 },
    { day: 'Wed', count: 38 },
    { day: 'Thu', count: 52 },
    { day: 'Fri', count: 48 },
    { day: 'Sat', count: 65 },
    { day: 'Sun', count: 58 },
  ];

  const genderData = [
    { name: 'Male', value: maleCount, color: portalChartPalette[1] },
    { name: 'Female', value: femaleCount, color: portalChartPalette[0] },
  ];

  const bandData = [
    { name: 'Peniel', value: members.filter(m => m.fellowshipBand === 'Peniel').length, fill: portalChartPalette[1] },
    { name: 'Judah', value: members.filter(m => m.fellowshipBand === 'Judah').length, fill: portalChartPalette[0] },
    { name: 'Zion', value: members.filter(m => m.fellowshipBand === 'Zion').length, fill: portalChartPalette[2] },
    { name: 'Ephraim', value: members.filter(m => m.fellowshipBand === 'Ephraim').length, fill: portalChartPalette[3] },
    { name: 'None', value: members.filter(m => m.fellowshipBand === 'None').length, fill: portalChartPalette[2] },
  ];

  const deptCounts: Record<string, number> = {};
  members.forEach(m => m.departments.forEach(d => { deptCounts[d] = (deptCounts[d] || 0) + 1; }));
  const deptData = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value, fill: 'var(--dark-card)' }));

  const groupData = [
    { name: 'Group A', value: members.filter(m => m.conventionGroup === 'Group A').length, color: portalChartPalette[1] },
    { name: 'Group B', value: members.filter(m => m.conventionGroup === 'Group B').length, color: portalChartPalette[0] },
    { name: 'Group C', value: members.filter(m => m.conventionGroup === 'Group C').length, color: portalChartPalette[2] },
    { name: 'Group D', value: members.filter(m => m.conventionGroup === 'Group D').length, color: portalChartPalette[3] },
    { name: 'Group E', value: members.filter(m => m.conventionGroup === 'Group E').length, color: portalChartPalette[2] },
  ];

  return (
    <AdminLayout
      pageTitle="Analytics"
      pageSubtitle="Review attendance patterns and member distribution."
    >

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Users} iconColor="var(--accent)" iconBg="rgba(138,138,133,0.1)" label="Total Youth Members" value={members.length} delay={0} />
        <StatCard icon={Shield} iconColor="var(--dark-card)" iconBg="rgba(138,138,133,0.1)" label="Total Executives" value={executives.length} delay={0.1} />
        <StatCard icon={UserCheck} iconColor="var(--label-ink)" iconBg="rgba(138,138,133,0.1)" label="Convention Attendees" value={presentCount} delay={0.2} />
        <StatCard icon={Activity} iconColor="var(--accent)" iconBg="rgba(138,138,133,0.1)" label="First Timers" value={ftTotal} delay={0.3} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Attendance Trends */}
        <motion.div
          className="portal-card p-6 lg:col-span-2"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        >
          <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Attendance Trends (Last 7 Days)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-line)" />
                <XAxis dataKey="day" tick={portalChartAxis} axisLine={false} tickLine={false} />
                <YAxis tick={portalChartAxis} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={portalChartTooltip} />
                <Area type="monotone" dataKey="count" stroke="var(--dark-card)" strokeWidth={2} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Gender Distribution */}
        <motion.div
          className="portal-card p-6"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Gender Distribution</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {genderData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={portalChartTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {genderData.map(g => (
              <div key={g.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                <span className="text-xs text-portal-label dark:text-portal-label">{g.name}: {g.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Fellowship Band */}
        <motion.div
          className="portal-card p-6"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        >
          <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Members by Fellowship Band</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bandData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-line)" vertical={false} />
                <XAxis dataKey="name" tick={portalChartAxis} axisLine={false} tickLine={false} />
                <YAxis tick={portalChartAxis} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={portalChartTooltip} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Department Analytics */}
        <motion.div
          className="portal-card p-6 lg:col-span-2"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        >
          <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Members by Department</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-line)" horizontal={false} />
                <XAxis type="number" tick={portalChartAxis} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={portalChartAxis} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={portalChartTooltip} />
                <defs>
                  <linearGradient id="deptGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--dark-card)" />
                    <stop offset="100%" stopColor="var(--muted)" />
                  </linearGradient>
                </defs>
                <Bar dataKey="value" fill="url(#deptGrad)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Convention Group */}
        <motion.div
          className="portal-card p-6"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        >
          <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">Convention Group Assignment</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={groupData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {groupData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={portalChartTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {groupData.map(g => (
              <div key={g.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                <span className="text-xs text-portal-label dark:text-portal-label">{g.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* First Timers */}
        <motion.div
          className="portal-card p-6"
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        >
          <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-4">First Timers Overview</h3>
          <div className="space-y-5">
            {[
              { label: 'Total First Timers', value: ftTotal, max: ftTotal },
              { label: 'Wants Membership', value: ftWantMembership, max: ftTotal, pct: Math.round((ftWantMembership / ftTotal) * 100) },
              { label: 'Followed Up', value: ftFollowedUp, max: ftTotal, pct: Math.round((ftFollowedUp / ftTotal) * 100) },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-portal-label dark:text-portal-label">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-mono text-portal-ink dark:text-white">{item.value}</span>
                    {'pct' in item && <span className="text-xs text-portal-label">{item.pct}%</span>}
                  </div>
                </div>
                <div className="h-2 bg-portal-surface dark:bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-portal-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / item.max) * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
