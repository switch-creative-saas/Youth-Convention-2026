import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, Pencil, Fingerprint, CalendarPlus } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import type { ChurchGroup, ConventionEvent, ManagedListEntity, ManagedListItem, Programme } from '@/types';
import { PillButton } from '@/components/ui-kit/PillButton';
import { PortalInput, formLabelClass } from '@/components/ui-kit/FormControls';

type ListItem = ManagedListItem & Partial<Pick<ChurchGroup, 'autoAssign' | 'forUnbanded'>>;

function ManagedList({ title, items, withColor = false, groupOptions = false, onSave, onDelete }: {
  title: string;
  items: ListItem[];
  withColor?: boolean;
  groupOptions?: boolean;
  onSave: (item: Partial<ListItem> & Pick<ListItem, 'name'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const save = async (item: Partial<ListItem> & Pick<ListItem, 'name'>) => {
    try { await onSave(item); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save item.'); }
  };
  const addItem = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await save({ name: trimmed, active: true, sortOrder: ordered.length ? ordered[ordered.length - 1].sortOrder + 1 : 0 });
    setName('');
  };
  const move = async (index: number, direction: -1 | 1) => {
    const neighbour = ordered[index + direction];
    const item = ordered[index];
    if (!neighbour) return;
    await save({ ...item, sortOrder: neighbour.sortOrder });
    await save({ ...neighbour, sortOrder: item.sortOrder });
  };

  return <section className="rounded-3xl border border-portal-line bg-white/70 p-5 shadow-sm dark:bg-portal-surface">
    <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-base font-semibold text-portal-ink dark:text-white">{title}</h3><span className="text-xs text-portal-label">{ordered.length} items</span></div>
    <div className="mb-3 flex gap-2">
      <PortalInput value={name} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void addItem(); }} placeholder={`Add ${title.toLowerCase().replace(/s$/, '')}`} />
      <PillButton variant="outline" onClick={() => void addItem()} aria-label={`Add ${title}`}><Plus className="h-4 w-4" /></PillButton>
    </div>
    {groupOptions && <p className="mb-3 text-[11px] leading-5 text-portal-label">Members with a band are balanced across groups marked "Auto". Members without a band go to the group marked "No band".</p>}
    {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
    {ordered.length === 0 && <p className="text-xs text-portal-label">Nothing added yet.</p>}
    <div className="space-y-2">
      {ordered.map((item, index) => <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-portal-line px-3 py-2">
        {withColor && <input type="color" aria-label={`${item.name} colour`} className="h-7 w-7 shrink-0 cursor-pointer rounded-full border-0 bg-transparent" defaultValue={item.color || '#8a8a85'} onBlur={event => { if (event.target.value !== item.color) void save({ ...item, color: event.target.value }); }} />}
        <input className="min-w-0 flex-1 bg-transparent text-sm text-portal-ink outline-none dark:text-white" defaultValue={item.name} onBlur={event => {
          const nextName = event.target.value.trim();
          if (nextName && nextName !== item.name) void save({ ...item, name: nextName });
        }} />
        <button type="button" aria-label="Move up" disabled={index === 0} className="p-1 text-portal-label disabled:opacity-30" onClick={() => void move(index, -1)}>↑</button>
        <button type="button" aria-label="Move down" disabled={index === ordered.length - 1} className="p-1 text-portal-label disabled:opacity-30" onClick={() => void move(index, 1)}>↓</button>
        {groupOptions && <>
          <button type="button" title="Include in automatic balancing" className={`rounded-full border px-2 py-1 text-[11px] ${item.autoAssign ? 'border-portal-dark text-portal-ink' : 'border-portal-line text-portal-label'}`} onClick={() => void save({ ...item, autoAssign: !item.autoAssign })}>Auto</button>
          <button type="button" title="Group for members without a band" className={`rounded-full border px-2 py-1 text-[11px] ${item.forUnbanded ? 'border-portal-dark text-portal-ink' : 'border-portal-line text-portal-label'}`} onClick={() => void save({ ...item, forUnbanded: !item.forUnbanded, autoAssign: item.forUnbanded ? item.autoAssign : false })}>No band</button>
        </>}
        <button type="button" className="rounded-full border border-portal-line px-2 py-1 text-[11px] text-portal-label" onClick={() => void save({ ...item, active: !item.active })}>{item.active ? 'Active' : 'Inactive'}</button>
        <button type="button" aria-label={`Delete ${item.name}`} className="p-1 text-red-500" onClick={() => void onDelete(item.id)}><Trash2 className="h-4 w-4" /></button>
      </div>)}
    </div>
  </section>;
}

type EventForm = { name: string; theme: string; scripture: string; venue: string; description: string; startDate: string; endDate: string; maxAttendees: string };
const EMPTY_EVENT: EventForm = { name: '', theme: '', scripture: '', venue: '', description: '', startDate: '', endDate: '', maxAttendees: '' };

function toForm(event: ConventionEvent | null): EventForm {
  if (!event) return EMPTY_EVENT;
  return {
    name: event.name, theme: event.theme, scripture: event.scripture, venue: event.venue, description: event.description,
    startDate: event.startDate, endDate: event.endDate, maxAttendees: event.maxAttendees ? String(event.maxAttendees) : '',
  };
}

export function AdminSettings() {
  const {
    currentEvent, events, saveEvent, activateEvent, programmes, saveProgramme, deleteProgramme,
    bands, departments, churchGroups, churchLocations, saveListItem, deleteListItem, purgeFingerprints,
  } = useAppData();
  const { addToast } = useToast();
  const [creatingNew, setCreatingNew] = useState(false);
  const editing = creatingNew ? null : currentEvent;
  const [form, setForm] = useState<EventForm>(toForm(editing));
  // Reset the form when the convention being edited changes (adjusting state during render, not in an effect).
  const editKey = editing ? `${editing.id}:${editing.name}:${editing.startDate}:${editing.endDate}` : 'new';
  const [formKey, setFormKey] = useState(editKey);
  if (formKey !== editKey) {
    setFormKey(editKey);
    setForm(toForm(editing));
  }
  const [saving, setSaving] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Programme | null>(null);
  const [sessionForm, setSessionForm] = useState({ title: '', description: '', date: '', startTime: '', endTime: '', location: '' });

  const fail = (title: string, error: unknown) => addToast({ type: 'error', title, description: error instanceof Error ? error.message : undefined });

  const handleSave = async () => {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      addToast({ type: 'warning', title: 'Name, start date and end date are required.' });
      return;
    }
    if (form.endDate < form.startDate) {
      addToast({ type: 'warning', title: 'The end date must be on or after the start date.' });
      return;
    }
    setSaving(true);
    try {
      await saveEvent({
        id: editing?.id, name: form.name, theme: form.theme, scripture: form.scripture, venue: form.venue, description: form.description,
        startDate: form.startDate, endDate: form.endDate, maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : null,
        isActive: creatingNew ? true : undefined,
      });
      setCreatingNew(false);
      addToast({ type: 'success', title: editing ? 'Convention updated' : 'Convention created and activated' });
    } catch (error) {
      fail('Could not save convention', error);
    } finally {
      setSaving(false);
    }
  };

  const submitSession = async () => {
    if (!sessionForm.title.trim() || !sessionForm.date || !sessionForm.startTime || !sessionForm.endTime) {
      addToast({ type: 'warning', title: 'Title, date, start and end time are required.' });
      return;
    }
    try {
      await saveProgramme(editingSession
        ? { ...sessionForm, id: editingSession.id, sortOrder: editingSession.sortOrder, active: editingSession.active }
        : { ...sessionForm, sortOrder: programmes.length });
      addToast({ type: 'success', title: editingSession ? 'Session updated' : 'Session added' });
      setShowSessionModal(false);
      setEditingSession(null);
    } catch (error) {
      fail('Could not save session', error);
    }
  };

  const removeSession = async (id: string) => {
    try { await deleteProgramme(id); addToast({ type: 'success', title: 'Session deleted' }); } catch (error) { fail('Could not delete session', error); }
  };

  const openSession = (session: Programme | null) => {
    setEditingSession(session);
    setSessionForm(session
      ? { title: session.title, description: session.description, date: session.date, startTime: session.startTime, endTime: session.endTime, location: session.location }
      : { title: '', description: '', date: currentEvent?.startDate ?? '', startTime: '', endTime: '', location: currentEvent?.venue ?? '' });
    setShowSessionModal(true);
  };

  const listHandlers = (entity: ManagedListEntity) => ({
    onSave: (item: Partial<ListItem> & Pick<ListItem, 'name'>) => saveListItem(entity, item),
    onDelete: async (id: string) => {
      try {
        const result = await deleteListItem(entity, id);
        if (result.message) addToast({ type: 'info', title: result.message });
      } catch (error) { fail('Could not delete item', error); }
    },
  });

  const handlePurge = async () => {
    if (!window.confirm('Delete every fingerprint template for this convention? Attendees will need to re-enrol. This cannot be undone.')) return;
    try {
      const count = await purgeFingerprints();
      addToast({ type: 'success', title: `Deleted ${count} fingerprint templates` });
    } catch (error) {
      fail('Could not purge fingerprints', error);
    }
  };

  const inputClass = 'portal-focus min-h-11 w-full rounded-2xl border border-portal-line bg-portal-surface px-3.5 py-2.5 text-sm text-portal-ink outline-none';
  const labelClass = formLabelClass;

  return (
    <AdminLayout pageTitle="Convention Settings" pageSubtitle="Manage convention details, schedules and the lists attendees choose from." requiresEvent={false}>
      <motion.div className="portal-card mb-6 p-6 sm:p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white">{editing ? 'Convention Details' : 'Create a Convention'}</h3>
          <div className="flex flex-wrap items-center gap-2">
            {events.length > 1 && !creatingNew && (
              <select aria-label="Active convention" value={currentEvent?.id ?? ''} onChange={event => void activateEvent(event.target.value).catch(error => fail('Could not switch convention', error))} className="portal-focus min-h-10 rounded-full border border-portal-line bg-portal-from px-3 text-xs text-portal-ink">
                {!currentEvent && <option value="">Select convention</option>}
                {events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
              </select>
            )}
            {currentEvent && (
              <button onClick={() => setCreatingNew(value => !value)} className="flex min-h-10 items-center gap-1.5 rounded-full border border-portal-line px-3 text-xs font-medium text-portal-ink">
                <CalendarPlus className="h-3.5 w-3.5" /> {creatingNew ? 'Cancel new convention' : 'Start a new convention'}
              </button>
            )}
          </div>
        </div>
        {!currentEvent && events.length > 0 && !creatingNew && (
          <p className="mb-4 text-sm text-portal-label">No convention is active. Pick one above or create a new one.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2"><label className={labelClass}>Convention Name *</label><PortalInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Youth Convention 2026" /></div>
          <div><label className={labelClass}>Theme</label><PortalInput value={form.theme} onChange={e => setForm({ ...form, theme: e.target.value })} /></div>
          <div><label className={labelClass}>Scripture</label><PortalInput value={form.scripture} onChange={e => setForm({ ...form, scripture: e.target.value })} /></div>
          <div><label className={labelClass}>Start Date *</label><PortalInput type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
          <div><label className={labelClass}>End Date *</label><PortalInput type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className={labelClass}>Venue</label><PortalInput value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></div>
          <div><label className={labelClass}>Max Attendees</label><PortalInput type="number" min={1} value={form.maxAttendees} onChange={e => setForm({ ...form, maxAttendees: e.target.value })} placeholder="No limit" /></div>
          <div className="sm:col-span-2"><label className={labelClass}>Description</label><textarea className={`${inputClass} min-h-20`} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <PillButton variant="dark" className="mt-6" onClick={() => void handleSave()} disabled={saving}>
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {editing ? 'Save Changes' : 'Create Convention'}
        </PillButton>
      </motion.div>

      {currentEvent && !creatingNew && (
        <>
          <motion.div className="portal-card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white">Convention Sessions</h3>
              <motion.button className="flex items-center gap-1.5 rounded-full bg-portal-accent px-4 py-2 text-sm font-medium text-portal-accent-ink" whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={() => openSession(null)}>
                <Plus className="w-4 h-4" /> Add Session
              </motion.button>
            </div>
            <div className="space-y-3">
              {programmes.length === 0 && <p className="text-sm text-portal-label">No sessions yet. Sessions appear on attendees' schedules.</p>}
              {[...programmes].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)).map(session => (
                <div key={session.id} className="flex items-center justify-between p-4 rounded-xl bg-portal-surface border border-portal-line">
                  <div>
                    <p className="font-medium text-sm text-portal-ink dark:text-white">{session.title}</p>
                    <p className="text-xs text-portal-label mt-0.5">{new Date(`${session.date}T00:00:00`).toLocaleDateString()} · {session.startTime} - {session.endTime}{session.location ? ` · ${session.location}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button aria-label={`Edit ${session.title}`} onClick={() => openSession(session)} className="p-2 rounded-lg hover:bg-portal-surface transition-colors"><Pencil className="w-4 h-4 text-portal-label" /></button>
                    <button aria-label={`Delete ${session.title}`} onClick={() => void removeSession(session.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className="mt-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h3 className="mb-4 text-lg font-semibold text-portal-ink dark:text-white">Lists</h3>
            <div className="grid gap-5 lg:grid-cols-2">
              <ManagedList title="Bands" items={bands} withColor {...listHandlers('bands')} />
              <ManagedList title="Departments" items={departments} {...listHandlers('departments')} />
              <ManagedList title="Groups" items={churchGroups} withColor groupOptions {...listHandlers('churchGroups')} />
              <ManagedList title="Locations" items={churchLocations} {...listHandlers('churchLocations')} />
            </div>
          </motion.div>

          <motion.div className="portal-card mt-6 p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h3 className="font-display font-semibold text-lg text-portal-ink dark:text-white">Fingerprint data</h3>
            <p className="mt-2 max-w-2xl text-sm text-portal-label">Fingerprint templates are personal data. Delete them once the convention is over; attendance records are kept.</p>
            <button onClick={() => void handlePurge()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-red-500/10 px-4 text-sm font-medium text-red-600 hover:bg-red-500/20">
              <Fingerprint className="h-4 w-4" /> Delete all fingerprint templates
            </button>
          </motion.div>
        </>
      )}

      {showSessionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSessionModal(false)} />
          <motion.div className="relative glass-modal dark:glass-modal-dark p-6 max-w-md w-full" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
            <h3 className="font-display font-bold text-lg text-portal-ink dark:text-white mb-4">{editingSession ? 'Edit Session' : 'Add Session'}</h3>
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
              <button onClick={() => setShowSessionModal(false)} className="flex-1 py-2.5 rounded-xl border border-portal-line text-sm font-medium text-portal-ink hover:bg-portal-surface">Cancel</button>
              <button onClick={() => void submitSession()} className="flex-1 py-2.5 rounded-xl gradient-btn text-sm font-medium">{editingSession ? 'Update' : 'Add'}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}
