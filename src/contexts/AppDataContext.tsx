import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import { photoUrl, supabase } from '@/lib/supabase';
import type {
  AccessItemType, AdminActivityLog, Attendee, AttendanceRecord, Band, BiometricDevice, BiometricLog, ChurchGroup,
  ChurchLocation, ConventionEvent, LeadershipRole, DepartmentItem, ManagedListEntity, Programme, RegistrationKind, RegistrationLink,
  Workspace, WorkspaceMember, WorkspaceRole,
} from '@/types';

const WORKSPACE_STORAGE_KEY = 'mosyf_current_workspace';

type Loader = 'biometric' | 'links' | 'devices';
type Row = Record<string, unknown>;

/** Replaces the row with the same id, or adds it (newest first unless prepend is false). */
function upsertRow<T extends { id: string | number }>(rows: T[], row: T, prepend = true, cap?: number) {
  const index = rows.findIndex(item => item.id === row.id);
  const next = index === -1 ? (prepend ? [row, ...rows] : [...rows, row]) : rows.map((item, i) => (i === index ? row : item));
  return cap ? next.slice(0, cap) : next;
}

/** Removes a row by id; returns the same array when it isn't present so nothing re-renders. */
function removeRow<T extends { id: string | number }>(rows: T[], id: unknown) {
  return rows.some(item => item.id === id) ? rows.filter(item => item.id !== id) : rows;
}

interface AppDataContextType {
  loading: boolean;
  error: string | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspaceId: (id: string) => void;
  events: ConventionEvent[];
  currentEvent: ConventionEvent | null;
  /** Today's date in the workspace timezone (YYYY-MM-DD), used for daily check-in. */
  today: string;

  members: Attendee[];
  executives: Attendee[];
  attendees: Attendee[];
  firstTimers: Attendee[];
  attendance: AttendanceRecord[];
  biometricLogs: BiometricLog[];
  biometricDevices: BiometricDevice[];
  adminActivities: AdminActivityLog[];
  registrationLinks: RegistrationLink[];
  bands: Band[];
  departments: DepartmentItem[];
  churchGroups: ChurchGroup[];
  churchLocations: ChurchLocation[];
  programmes: Programme[];
  leadershipRoles: LeadershipRole[];
  workspaceMembers: WorkspaceMember[];
  myRoles: WorkspaceRole[];

  refresh: () => Promise<void>;
  /** Re-reads one attendee after an action (e.g. a fingerprint check-in) without reloading everyone. */
  refreshAttendee: (attendeeId: string) => Promise<void>;
  saveEvent: (event: Partial<ConventionEvent> & Pick<ConventionEvent, 'name' | 'startDate' | 'endDate'>) => Promise<ConventionEvent>;
  activateEvent: (eventId: string) => Promise<void>;
  saveListItem: (entity: ManagedListEntity, item: Partial<ChurchGroup> & Pick<Band, 'name'>) => Promise<void>;
  deleteListItem: (entity: ManagedListEntity, id: string) => Promise<{ ok: boolean; message?: string }>;
  saveProgramme: (programme: Partial<Programme> & Pick<Programme, 'title' | 'date' | 'startTime' | 'endTime'>) => Promise<void>;
  deleteProgramme: (id: string) => Promise<void>;
  createRegistrationLink: (kind: RegistrationKind, options?: { label?: string; maxUses?: number | null; expiresAt?: string | null }) => Promise<RegistrationLink>;
  setRegistrationLinkActive: (id: string, active: boolean) => Promise<void>;
  updateAttendee: (id: string, patch: { leadershipRole?: string; firstTimerFollowedUp?: boolean }) => Promise<void>;
  deleteAttendee: (attendee: Attendee) => Promise<void>;
  recordManualCheckIn: (attendeeId: string, method?: 'manual' | 'qr_code') => Promise<void>;
  claimAccessItem: (attendeeId: string, item: AccessItemType) => Promise<{ ok: boolean; message: string }>;
  saveDevice: (device: Partial<BiometricDevice> & Pick<BiometricDevice, 'name'>) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
  reportDeviceStatus: (id: string, status: BiometricDevice['status']) => Promise<void>;
  purgeFingerprints: () => Promise<number>;
  /** Gives someone dashboard access, creating and inviting their login if needed. */
  inviteStaff: (email: string, role: WorkspaceRole, name?: string) => Promise<api.InviteResult>;
  revokeRole: (userId: string, role: WorkspaceRole) => Promise<void>;
  createWorkspace: (input: { name: string; slug: string; ownerEmail: string; ownerName?: string; codePrefix: string }) => Promise<api.InviteResult>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

function readStoredWorkspace() {
  try { return window.localStorage.getItem(WORKSPACE_STORAGE_KEY); } catch { return null; }
}

type EventConfig = Awaited<ReturnType<typeof api.fetchEventConfig>>;
type AttendeeData = Awaited<ReturnType<typeof api.fetchAttendeeData>>;
const EMPTY_CONFIG: EventConfig = { bands: [], departments: [], churchGroups: [], churchLocations: [], programmes: [], leadershipRoles: [] };
const EMPTY_ATTENDEE_DATA: AttendeeData = { attendees: [], departments: [], claims: [] };
const EMPTY: never[] = [];

function fetchWorkspaceBundle(workspaceId: string) {
  return Promise.all([api.fetchEvents(workspaceId), api.fetchDevices(workspaceId), api.fetchActivity(workspaceId), api.fetchWorkspaceMembers(workspaceId)]);
}

function fetchEventBundle(eventId: string) {
  return Promise.all([api.fetchEventConfig(eventId), api.fetchAttendeeData(eventId), api.fetchAttendance(eventId), api.fetchBiometricEvents(eventId), api.fetchLinks(eventId)]);
}

function todayIn(timezone: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, memberships, isPlatformAdmin } = useAuth();
  const userId = user?.id ?? null;

  const [error, setError] = useState<string | null>(null);
  // Fetched data is tagged with the user / workspace / event it belongs to, so switching never shows stale rows.
  const [workspaceList, setWorkspaceList] = useState<{ userId: string | null; list: Workspace[] }>({ userId: null, list: [] });
  const [workspaceId, setWorkspaceId] = useState<string | null>(readStoredWorkspace);
  const [eventList, setEventList] = useState<{ workspaceId: string | null; list: ConventionEvent[] }>({ workspaceId: null, list: [] });
  const [dataEventId, setDataEventId] = useState<string | null>(null);
  const [config, setConfig] = useState<EventConfig>(EMPTY_CONFIG);
  const [attendeeData, setAttendeeData] = useState<AttendeeData>(EMPTY_ATTENDEE_DATA);
  const [attendanceRows, setAttendanceRows] = useState<api.AttendanceRow[]>([]);
  const [biometricRows, setBiometricRows] = useState<api.BiometricEventRow[]>([]);
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [activities, setActivities] = useState<AdminActivityLog[]>([]);
  const [links, setLinks] = useState<RegistrationLink[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);

  const workspaces = useMemo(() => (workspaceList.userId === userId ? workspaceList.list : EMPTY), [workspaceList, userId]);
  const currentWorkspace = useMemo(
    () => workspaces.find(ws => ws.id === workspaceId) ?? workspaces[0] ?? null,
    [workspaces, workspaceId],
  );
  const wsId = currentWorkspace?.id ?? null;
  const events = useMemo(() => (eventList.workspaceId === wsId ? eventList.list : EMPTY), [eventList, wsId]);
  const currentEvent = useMemo(() => events.find(event => event.isActive) ?? null, [events]);
  const eventId = currentEvent?.id ?? null;
  const scoped = eventId !== null && dataEventId === eventId;
  const scopedConfig = scoped ? config : EMPTY_CONFIG;
  const scopedAttendeeData = scoped ? attendeeData : EMPTY_ATTENDEE_DATA;
  const scopedAttendance = scoped ? attendanceRows : EMPTY;
  const scopedBiometric = scoped ? biometricRows : EMPTY;
  const scopedLinks = scoped ? links : EMPTY;
  const loading = (Boolean(userId) && workspaceList.userId !== userId) || (wsId !== null && eventList.workspaceId !== wsId);
  const today = todayIn(currentWorkspace?.timezone ?? 'Africa/Lagos');

  const myRoles = useMemo<WorkspaceRole[]>(() => {
    if (isPlatformAdmin) return ['admin'];
    return memberships.filter(m => m.workspaceId === wsId).map(m => m.role);
  }, [isPlatformAdmin, memberships, wsId]);

  const setCurrentWorkspaceId = useCallback((id: string) => {
    setWorkspaceId(id);
    try { window.localStorage.setItem(WORKSPACE_STORAGE_KEY, id); } catch { /* per-viewer convenience only */ }
  }, []);

  // ---- loaders -----------------------------------------------------------
  // Small lists that are cheap to reload after the user's own actions.
  const loaders = useMemo<Record<Loader, () => Promise<void>>>(() => ({
    biometric: async () => { if (eventId) setBiometricRows(await api.fetchBiometricEvents(eventId)); },
    links: async () => { if (eventId) setLinks(await api.fetchLinks(eventId)); },
    devices: async () => { if (wsId) setDevices(await api.fetchDevices(wsId)); },
  }), [eventId, wsId]);

  /** Re-reads one attendee (row, departments, claims, attendance) and patches it into state. */
  const refreshAttendee = useCallback(async (attendeeId: string) => {
    const snapshot = await api.fetchAttendeeSnapshot(attendeeId);
    setAttendeeData(prev => ({
      attendees: snapshot.attendee ? upsertRow(prev.attendees, snapshot.attendee) : removeRow(prev.attendees, attendeeId),
      departments: [...prev.departments.filter(row => row.attendee_id !== attendeeId), ...snapshot.departments],
      claims: [...prev.claims.filter(row => row.attendee_id !== attendeeId), ...snapshot.claims],
    }));
    setAttendanceRows(prev => [...snapshot.attendance, ...prev.filter(row => row.attendee_id !== attendeeId)]
      .sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at)));
  }, []);

  // Fetch first, then apply in a callback; state is only set once data has arrived.
  const applyWorkspaceBundle = useCallback((workspace: string, bundle: Awaited<ReturnType<typeof fetchWorkspaceBundle>>) => {
    const [nextEvents, nextDevices, nextActivity, nextMembers] = bundle;
    setDevices(nextDevices); setActivities(nextActivity); setWorkspaceMembers(nextMembers);
    setEventList({ workspaceId: workspace, list: nextEvents });
    setError(null);
  }, []);

  const applyEventBundle = useCallback((event: string, bundle: Awaited<ReturnType<typeof fetchEventBundle>>) => {
    const [nextConfig, nextAttendees, nextAttendance, nextBiometric, nextLinks] = bundle;
    setConfig(nextConfig); setAttendeeData(nextAttendees); setAttendanceRows(nextAttendance);
    setBiometricRows(nextBiometric); setLinks(nextLinks);
    setDataEventId(event);
  }, []);

  const reportError = useCallback((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)), []);

  // Workspaces for the signed-in user (refetched when their memberships change).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api.fetchWorkspaces()
      .then(list => { if (!cancelled) setWorkspaceList({ userId, list }); })
      .catch(cause => { if (!cancelled) { setWorkspaceList({ userId, list: [] }); reportError(cause); } });
    return () => { cancelled = true; };
  }, [userId, memberships, reportError]);

  useEffect(() => {
    if (!wsId) return;
    let cancelled = false;
    fetchWorkspaceBundle(wsId)
      .then(bundle => { if (!cancelled) applyWorkspaceBundle(wsId, bundle); })
      .catch(cause => { if (!cancelled) reportError(cause); });
    return () => { cancelled = true; };
  }, [wsId, applyWorkspaceBundle, reportError]);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    fetchEventBundle(eventId)
      .then(bundle => { if (!cancelled) applyEventBundle(eventId, bundle); })
      .catch(cause => { if (!cancelled) reportError(cause); });
    return () => { cancelled = true; };
  }, [eventId, applyEventBundle, reportError]);

  /** Full reload of everything for the current workspace and event. */
  const resync = useCallback(async () => {
    if (wsId) applyWorkspaceBundle(wsId, await fetchWorkspaceBundle(wsId));
    if (eventId) applyEventBundle(eventId, await fetchEventBundle(eventId));
  }, [wsId, eventId, applyWorkspaceBundle, applyEventBundle]);
  const resyncRef = useRef(resync);
  useEffect(() => { resyncRef.current = resync; }, [resync]);

  // ---- realtime ------------------------------------------------------------
  // Changes are applied from the realtime payload (one row each) instead of re-downloading whole
  // lists, which keeps bandwidth tiny during busy check-in. After a dropped connection the screen
  // does one full reload to catch anything it missed.
  useEffect(() => {
    if (!wsId) return;
    const filter = `workspace_id=eq.${wsId}`;
    const forEvent = (row: Row) => eventId !== null && row.event_id === eventId;
    const channel = supabase.channel(`workspace-${wsId}-${eventId ?? 'none'}`);
    const listen = (table: string, onUpsert: (row: Row) => void, onDelete: (old: Row) => void) => {
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, payload => onUpsert(payload.new as Row));
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, payload => onUpsert(payload.new as Row));
      // Delete events can't be filtered and only carry the primary key; unknown ids are no-ops.
      channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, payload => onDelete(payload.old as Row));
    };

    listen('attendees',
      row => { if (forEvent(row)) setAttendeeData(prev => ({ ...prev, attendees: upsertRow(prev.attendees, row as api.AttendeeRow) })); },
      old => setAttendeeData(prev => (prev.attendees.some(item => item.id === old.id) ? {
        attendees: prev.attendees.filter(item => item.id !== old.id),
        departments: prev.departments.filter(item => item.attendee_id !== old.id),
        claims: prev.claims.filter(item => item.attendee_id !== old.id),
      } : prev)));
    listen('attendee_departments',
      row => {
        if (!forEvent(row)) return;
        const link = row as api.AttendeeDepartmentRow;
        setAttendeeData(prev => (prev.departments.some(item => item.attendee_id === link.attendee_id && item.department_id === link.department_id)
          ? prev : { ...prev, departments: [...prev.departments, link] }));
      },
      old => setAttendeeData(prev => (prev.departments.some(item => item.attendee_id === old.attendee_id && item.department_id === old.department_id)
        ? { ...prev, departments: prev.departments.filter(item => !(item.attendee_id === old.attendee_id && item.department_id === old.department_id)) }
        : prev)));
    listen('access_claims',
      row => { if (forEvent(row)) setAttendeeData(prev => ({ ...prev, claims: upsertRow(prev.claims, row as api.AccessClaimRow, false) })); },
      old => setAttendeeData(prev => (prev.claims.some(item => item.id === old.id) ? { ...prev, claims: removeRow(prev.claims, old.id) } : prev)));
    listen('attendance',
      row => { if (forEvent(row)) setAttendanceRows(prev => upsertRow(prev, row as api.AttendanceRow)); },
      old => setAttendanceRows(prev => removeRow(prev, old.id)));
    listen('biometric_events',
      row => { if (forEvent(row)) setBiometricRows(prev => upsertRow(prev, row as api.BiometricEventRow, true, 200)); },
      old => setBiometricRows(prev => removeRow(prev, old.id)));
    listen('activity_log',
      row => setActivities(prev => upsertRow(prev, api.mapActivity(row as Parameters<typeof api.mapActivity>[0]), true, 100)),
      old => setActivities(prev => removeRow(prev, old.id)));
    listen('registration_links',
      row => { if (forEvent(row)) setLinks(prev => upsertRow(prev, api.mapLink(row as Parameters<typeof api.mapLink>[0]))); },
      old => setLinks(prev => removeRow(prev, old.id)));
    listen('biometric_devices',
      row => setDevices(prev => upsertRow(prev, api.mapDevice(row as Parameters<typeof api.mapDevice>[0]), false)),
      old => setDevices(prev => removeRow(prev, old.id)));

    let subscribedBefore = false;
    channel.subscribe(status => {
      if (status !== 'SUBSCRIBED') return;
      if (subscribedBefore) void resyncRef.current().catch(console.error);
      subscribedBefore = true;
    });
    return () => { void supabase.removeChannel(channel); };
  }, [wsId, eventId]);

  // ---- derived -------------------------------------------------------------
  const attendees = useMemo<Attendee[]>(() => {
    const bandsById = new Map(scopedConfig.bands.map(item => [item.id, item.name]));
    const groupsById = new Map(scopedConfig.churchGroups.map(item => [item.id, item.name]));
    const locationsById = new Map(scopedConfig.churchLocations.map(item => [item.id, item.name]));
    const departmentsById = new Map(scopedConfig.departments.map(item => [item.id, item.name]));
    const departmentIds = new Map<string, string[]>();
    scopedAttendeeData.departments.forEach(row => {
      departmentIds.set(row.attendee_id, [...(departmentIds.get(row.attendee_id) ?? []), row.department_id]);
    });
    const claims = new Map<string, Partial<Record<AccessItemType, string>>>();
    scopedAttendeeData.claims.forEach(row => {
      claims.set(row.attendee_id, { ...(claims.get(row.attendee_id) ?? {}), [row.item]: row.claimed_at });
    });
    return scopedAttendeeData.attendees.map(row => {
      const ids = departmentIds.get(row.id) ?? [];
      return {
        id: row.id,
        kind: row.kind,
        code: row.code,
        statusToken: row.status_token,
        fullName: row.full_name,
        email: row.email,
        phoneNumber: row.phone_number,
        gender: row.gender === 'Male' || row.gender === 'Female' ? row.gender : null,
        dateOfBirth: row.date_of_birth,
        address: row.address ?? '',
        occupation: row.occupation ?? '',
        emergencyContact: row.emergency_contact ?? '',
        churchLocationId: row.church_location_id,
        churchBranch: (row.church_location_id && locationsById.get(row.church_location_id)) || '',
        bandId: row.band_id,
        fellowshipBand: (row.band_id && bandsById.get(row.band_id)) || 'None',
        groupId: row.group_id,
        conventionGroup: (row.group_id && groupsById.get(row.group_id)) || (row.kind === 'executive' ? 'Executive' : 'Unassigned'),
        departmentIds: ids,
        departments: ids.map(id => departmentsById.get(id) ?? '').filter(Boolean),
        leadershipRole: row.leadership_role ?? '',
        photoPath: row.photo_path,
        profilePhoto: photoUrl(row.photo_path),
        isFirstTimer: row.is_first_timer,
        wantsPermanentMembership: row.wants_permanent_membership,
        invitedBy: row.invited_by ?? '',
        firstTimerFollowedUp: row.first_timer_followed_up,
        biometricStatus: row.biometric_status,
        biometricConsentAt: row.biometric_consent_at,
        lastVerifiedAt: row.last_verified_at,
        registeredAt: row.registered_at,
        confirmationEmailSentAt: row.confirmation_email_sent_at,
        confirmationEmailError: row.confirmation_email_error,
        accessClaims: claims.get(row.id) ?? {},
      };
    });
  }, [scopedAttendeeData, scopedConfig]);

  const attendeesById = useMemo(() => new Map(attendees.map(item => [item.id, item])), [attendees]);
  const members = useMemo(() => attendees.filter(item => item.kind === 'member'), [attendees]);
  const executives = useMemo(() => attendees.filter(item => item.kind === 'executive'), [attendees]);
  const firstTimers = useMemo(() => members.filter(item => item.isFirstTimer), [members]);

  const attendance = useMemo<AttendanceRecord[]>(() => {
    const programmesById = new Map(scopedConfig.programmes.map(item => [item.id, item.title]));
    return scopedAttendance.map(row => ({
      id: row.id,
      attendeeId: row.attendee_id,
      attendeeName: attendeesById.get(row.attendee_id)?.fullName ?? 'Unknown attendee',
      attendeeCode: attendeesById.get(row.attendee_id)?.code ?? '',
      checkInTime: row.checked_in_at,
      attendanceDate: row.attendance_date,
      verificationMethod: row.method,
      programmeId: row.programme_id,
      sessionName: (row.programme_id && programmesById.get(row.programme_id)) || 'Daily check-in',
    }));
  }, [scopedAttendance, attendeesById, scopedConfig.programmes]);

  const biometricLogs = useMemo<BiometricLog[]>(() => scopedBiometric.map(row => ({
    id: row.id,
    attendeeId: row.attendee_id,
    attendeeName: row.attendee_id ? attendeesById.get(row.attendee_id)?.fullName ?? null : null,
    deviceId: row.device_id,
    kind: row.kind,
    status: row.result,
    matchScore: row.match_score,
    message: row.message ?? '',
    createdAt: row.created_at,
  })), [scopedBiometric, attendeesById]);

  // ---- actions -------------------------------------------------------------
  const requireWorkspace = useCallback(() => {
    if (!wsId) throw new Error('No workspace selected.');
    return wsId;
  }, [wsId]);
  const requireEvent = useCallback(() => {
    if (!wsId || !eventId) throw new Error('Create and activate a convention in Settings first.');
    return { workspaceId: wsId, eventId };
  }, [wsId, eventId]);

  const refresh = resync;

  const reloadConfig = useCallback(async () => {
    if (eventId) setConfig(await api.fetchEventConfig(eventId));
  }, [eventId]);

  const value: AppDataContextType = {
    loading, error, workspaces, currentWorkspace, setCurrentWorkspaceId, events, currentEvent, today,
    members, executives, attendees, firstTimers, attendance, biometricLogs, biometricDevices: devices,
    adminActivities: activities, registrationLinks: scopedLinks, ...scopedConfig, workspaceMembers, myRoles,
    refresh,
    refreshAttendee,

    saveEvent: async event => {
      const workspace = requireWorkspace();
      const saved = await api.saveEvent(workspace, event);
      if (!events.some(item => item.isActive) || event.isActive) await api.activateEvent(saved.id);
      setEventList({ workspaceId: workspace, list: await api.fetchEvents(workspace) });
      return saved;
    },
    activateEvent: async id => {
      await api.activateEvent(id);
      const workspace = requireWorkspace();
      setEventList({ workspaceId: workspace, list: await api.fetchEvents(workspace) });
    },
    saveListItem: async (entity, item) => {
      const scope = requireEvent();
      await api.saveListItem(entity, scope.workspaceId, scope.eventId, item);
      await reloadConfig();
    },
    deleteListItem: async (entity, id) => {
      const result = await api.deleteListItem(entity, id);
      await reloadConfig();
      return result;
    },
    saveProgramme: async programme => {
      const scope = requireEvent();
      await api.saveProgramme(scope.workspaceId, scope.eventId, programme);
      await reloadConfig();
    },
    deleteProgramme: async id => {
      await api.deleteProgramme(id);
      await reloadConfig();
    },
    createRegistrationLink: async (kind, options) => {
      const scope = requireEvent();
      const link = await api.createRegistrationLink(scope.workspaceId, scope.eventId, kind, options);
      await loaders.links();
      return link;
    },
    setRegistrationLinkActive: async (id, active) => {
      await api.setRegistrationLinkActive(id, active);
      await loaders.links();
    },
    updateAttendee: async (id, patch) => {
      await api.updateAttendee(id, patch);
      await refreshAttendee(id);
    },
    deleteAttendee: async attendee => {
      await api.deleteAttendee(attendee.id, attendee.photoPath);
      setAttendeeData(prev => ({
        attendees: removeRow(prev.attendees, attendee.id),
        departments: prev.departments.filter(row => row.attendee_id !== attendee.id),
        claims: prev.claims.filter(row => row.attendee_id !== attendee.id),
      }));
      setAttendanceRows(prev => prev.filter(row => row.attendee_id !== attendee.id));
    },
    recordManualCheckIn: async (attendeeId, method = 'manual') => {
      const scope = requireEvent();
      if (!userId) throw new Error('Not signed in.');
      await api.recordManualCheckIn(scope.workspaceId, scope.eventId, attendeeId, today, userId, method);
      await refreshAttendee(attendeeId);
    },
    claimAccessItem: async (attendeeId, item) => {
      const result = await api.claimAccessItem(attendeeId, item);
      await refreshAttendee(attendeeId);
      return result;
    },
    saveDevice: async device => {
      await api.saveDevice(requireWorkspace(), device);
      await loaders.devices();
    },
    deleteDevice: async id => {
      await api.deleteDevice(id);
      await loaders.devices();
    },
    reportDeviceStatus: async (id, status) => {
      if (!userId) return;
      await api.reportDeviceStatus(id, status, userId);
      await loaders.devices();
    },
    purgeFingerprints: async () => {
      const scope = requireEvent();
      const count = await api.purgeEventFingerprints(scope.eventId);
      await loaders.biometric();
      return count;
    },
    inviteStaff: async (email, role, name) => {
      const workspace = requireWorkspace();
      const result = await api.inviteStaff({ workspaceId: workspace, email, role, name });
      setWorkspaceMembers(await api.fetchWorkspaceMembers(workspace));
      return result;
    },
    revokeRole: async (memberUserId, role) => {
      const workspace = requireWorkspace();
      await api.revokeWorkspaceRole(workspace, memberUserId, role);
      setWorkspaceMembers(await api.fetchWorkspaceMembers(workspace));
    },
    createWorkspace: async input => {
      const result = await api.createWorkspace(input);
      setWorkspaceList({ userId, list: await api.fetchWorkspaces() });
      if (result.workspaceId) setCurrentWorkspaceId(result.workspaceId);
      return result;
    },
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
