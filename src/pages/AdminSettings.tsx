import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, Pencil } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import type { ManagedListItem, Programme } from '@/types';
import { PillButton } from '@/components/ui-kit/PillButton';
import { PortalInput, formLabelClass } from '@/components/ui-kit/FormControls';

function ManagedList({ title, items, onSave, onDelete }: {
  title: string;
  items: ManagedListItem[];
  onSave: (item: ManagedListItem) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const addItem = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      onSave({ id: crypto.randomUUID(), name: trimmed, active: true, sortOrder: ordered.length });
      setName('');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save item.');
    }
  };
  const move = (index: number, direction: -1 | 1) => {
    const neighbour = ordered[index + direction];
    const item = ordered[index];
    if (!neighbour) return;
    onSave({ ...item, sortOrder: neighbour.sortOrder });
    onSave({ ...neighbour, sortOrder: item.sortOrder });
  };

  return <section className="rounded-3xl border border-portal-line bg-white/70 p-5 shadow-sm dark:bg-portal-surface">
    <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-base font-semibold text-portal-ink dark:text-white">{title}</h3><span className="text-xs text-portal-label">{ordered.length} items</span></div>
    <div className="mb-3 flex gap-2">
      <PortalInput value={name} onChange={event => setName(event.target.value)} placeholder={`Add ${title.toLowerCase().slice(0, -1)}`} />
      <PillButton variant="outline" onClick={addItem} aria-label={`Add ${title}`}><Plus className="h-4 w-4" /></PillButton>
    </div>
    {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
    <div className="space-y-2">
      {ordered.map((item, index) => <div key={item.id} className="flex items-center gap-2 rounded-2xl border border-portal-line px-3 py-2">
        <input className="min-w-0 flex-1 bg-transparent text-sm text-portal-ink outline-none dark:text-white" defaultValue={item.name} onBlur={event => {
          const nextName = event.target.value.trim();
          if (nextName && nextName !== item.name) onSave({ ...item, name: nextName });
        }} />
        <button type="button" aria-label="Move up" disabled={index === 0} className="p-1 text-portal-label disabled:opacity-30" onClick={() => move(index, -1)}>↑</button>
        <button type="button" aria-label="Move down" disabled={index === ordered.length - 1} className="p-1 text-portal-label disabled:opacity-30" onClick={() => move(index, 1)}>↓</button>
        <button type="button" className="rounded-full border border-portal-line px-2 py-1 text-[11px] text-portal-label" onClick={() => onSave({ ...item, active: !item.active })}>{item.active ? 'Active' : 'Inactive'}</button>
        <button type="button" aria-label={`Delete ${item.name}`} className="p-1 text-red-500" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4" /></button>
      </div>)}
    </div>
  </section>;
}

export function AdminSettings() {
  const { conventionSettings, updateConventionSettings, resetDemoData, programmes, saveProgramme, deleteProgramme, bands, departments, churchGroups, churchLocations, saveListItem, deleteListItem } = useAppData();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [settings, setSettings] = useState({ ...conventionSettings });
  const [saving, setSaving] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Programme | null>(null);
  const [sessionForm, setSessionForm] = useState({ title: '', description: '', date: '', startTime: '', endTime: '', location: '' });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    updateConventionSettings(settings);
    setSaving(false);
    addToast({ type: 'success', title: 'Convention settings updated!' });
  };

  const addSession = () => {
    saveProgramme(sessionForm, user?.email ?? 'system', user?.name ?? 'System');
    setShowSessionModal(false);
    setSessionForm({ title: '', description: '', date: '', startTime: '', endTime: '', location: '' });
    addToast({ type: 'success', title: 'Session added!' });
  };

  const updateSession = () => {
    if (!editingSession) return;
    saveProgramme({ ...sessionForm, id: editingSession.id, sortOrder: editingSession.sortOrder, active: editingSession.active }, user?.email ?? 'system', user?.name ?? 'System');
    setEditingSession(null);
    setSessionForm({ title: '', description: '', date: '', startTime: '', endTime: '', location: '' });
    addToast({ type: 'success', title: 'Session updated!' });
  };

  const deleteSession = (id: string) => {
    deleteProgramme(id, user?.email ?? 'system', user?.name ?? 'System');
    addToast({ type: 'success', title: 'Session deleted!' });
  };

  const openEditSession = (session: Programme) => {
    setEditingSession(session);
    setSessionForm({ title: session.title, description: session.description, date: session.date, startTime: session.startTime, endTime: session.endTime, location: session.location });
    setShowSessionModal(true);
  };

  const inputClass = "portal-focus min-h-11 w-full rounded-2xl border border-portal-line bg-portal-surface px-3.5 py-2.5 text-sm text-portal-ink outline-none";
  const labelClass = formLabelClass;

  return (
    <AdminLayout
      pageTitle="Convention Settings"
      pageSubtitle="Manage convention details, schedules, and registration settings."
    >

      {/* Convention Details */}
      <motion.div
        className="portal-card mb-6 p-6 sm:p-8"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      >
        <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white mb-6">Convention Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Convention Name</label>
            <PortalInput value={settings.name} onChange={e => setSettings({ ...settings, name: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Theme</label>
            <PortalInput value={settings.theme} onChange={e => setSettings({ ...settings, theme: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Start Date</label>
            <PortalInput type="date" value={settings.startDate} onChange={e => setSettings({ ...settings, startDate: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>End Date</label>
            <PortalInput type="date" value={settings.endDate} onChange={e => setSettings({ ...settings, endDate: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Location</label>
            <PortalInput value={settings.location} onChange={e => setSettings({ ...settings, location: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Max Attendees</label>
            <PortalInput type="number" value={settings.maxAttendees} onChange={e => setSettings({ ...settings, maxAttendees: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`relative w-12 h-7 rounded-full transition-colors ${settings.isActive ? 'bg-portal-dark' : 'bg-portal-surface dark:bg-portal-surface'}`}>
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${settings.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <input type="checkbox" className="sr-only" checked={settings.isActive} onChange={e => setSettings({ ...settings, isActive: e.target.checked })} />
              <span className="text-sm font-medium text-portal-ink dark:text-portal-label">{settings.isActive ? 'Active' : 'Inactive'}</span>
            </label>
          </div>
        </div>
        <PillButton
          variant="dark"
          className="mt-6"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </PillButton>
        {user?.role === 'super_admin' && <PillButton variant="outline" className="mt-6 ml-3" onClick={resetDemoData}>Reset demo data</PillButton>}
      </motion.div>

      {/* Sessions Manager */}
      <motion.div
        className="portal-card p-6"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white">Convention Sessions</h3>
          <motion.button
            className="flex items-center gap-1.5 rounded-full bg-portal-accent px-4 py-2 text-sm font-medium text-portal-accent-ink"
            whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setEditingSession(null); setSessionForm({ title: '', description: '', date: '', startTime: '', endTime: '', location: '' }); setShowSessionModal(true); }}
          >
            <Plus className="w-4 h-4" /> Add Session
          </motion.button>
        </div>
        <div className="space-y-3">
          {[...programmes].sort((a, b) => a.sortOrder - b.sortOrder).map((session, i) => (
            <motion.div
              key={session.id}
              className="flex items-center justify-between p-4 rounded-xl bg-portal-surface dark:bg-white/[0.03] border border-portal-line dark:border-white/[0.04]"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
            >
              <div>
                <p className="font-medium text-sm text-portal-ink dark:text-white">{session.title}</p>
                <p className="text-xs text-portal-label mt-0.5">
                  {new Date(session.date).toLocaleDateString()} · {session.startTime} - {session.endTime} · {session.location}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditSession(session)} className="p-2 rounded-lg hover:bg-portal-surface dark:hover:bg-white/10 transition-colors">
                  <Pencil className="w-4 h-4 text-portal-label" />
                </button>
                <button onClick={() => deleteSession(session.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div className="mt-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h3 className="mb-4 text-lg font-semibold text-portal-ink dark:text-white">Lists</h3>
        <div className="grid gap-5 lg:grid-cols-2">
        <ManagedList title="Bands" items={bands} onSave={item => saveListItem('bands', item, user?.email ?? 'system', user?.name ?? 'System')} onDelete={id => {
          const result = deleteListItem('bands', id, user?.email ?? 'system', user?.name ?? 'System');
          if (result.message) addToast({ type: 'info', title: result.message });
        }} />
        <ManagedList title="Departments" items={departments} onSave={item => saveListItem('departments', item, user?.email ?? 'system', user?.name ?? 'System')} onDelete={id => {
          const result = deleteListItem('departments', id, user?.email ?? 'system', user?.name ?? 'System');
          if (result.message) addToast({ type: 'info', title: result.message });
        }} />
        <ManagedList title="Groups" items={churchGroups} onSave={item => saveListItem('churchGroups', item, user?.email ?? 'system', user?.name ?? 'System')} onDelete={id => {
          const result = deleteListItem('churchGroups', id, user?.email ?? 'system', user?.name ?? 'System');
          if (result.message) addToast({ type: 'info', title: result.message });
        }} />
        <ManagedList title="Locations" items={churchLocations} onSave={item => saveListItem('churchLocations', item, user?.email ?? 'system', user?.name ?? 'System')} onDelete={id => {
          const result = deleteListItem('churchLocations', id, user?.email ?? 'system', user?.name ?? 'System');
          if (result.message) addToast({ type: 'info', title: result.message });
        }} />
        </div>
      </motion.div>

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSessionModal(false)} />
          <motion.div className="relative glass-modal dark:glass-modal-dark p-6 max-w-md w-full" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <h3 className="font-display font-bold text-lg text-portal-ink dark:text-white mb-4">
              {editingSession ? 'Edit Session' : 'Add Session'}
            </h3>
            <div className="space-y-4">
              <div><label className={labelClass}>Name</label><input className={inputClass} value={sessionForm.title} onChange={e => setSessionForm({ ...sessionForm, title: e.target.value })} /></div>
              <div><label className={labelClass}>Description</label><input className={inputClass} value={sessionForm.description} onChange={e => setSessionForm({ ...sessionForm, description: e.target.value })} /></div>
              <div><label className={labelClass}>Date</label><input type="date" className={inputClass} value={sessionForm.date} onChange={e => setSessionForm({ ...sessionForm, date: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Start Time</label><input type="time" className={inputClass} value={sessionForm.startTime} onChange={e => setSessionForm({ ...sessionForm, startTime: e.target.value })} /></div>
                <div><label className={labelClass}>End Time</label><input type="time" className={inputClass} value={sessionForm.endTime} onChange={e => setSessionForm({ ...sessionForm, endTime: e.target.value })} /></div>
              </div>
              <div><label className={labelClass}>Venue</label><input className={inputClass} value={sessionForm.location} onChange={e => setSessionForm({ ...sessionForm, location: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSessionModal(false)} className="flex-1 py-2.5 rounded-xl border border-portal-line dark:border-white/10 text-sm font-medium text-portal-ink dark:text-portal-label hover:bg-portal-surface dark:hover:bg-white/5">Cancel</button>
              <button onClick={editingSession ? updateSession : addSession} className="flex-1 py-2.5 rounded-xl gradient-btn text-sm font-medium">
                {editingSession ? 'Update' : 'Add'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}
