import { appBaseUrl, errorMessage, registrationUrl, supabase } from '@/lib/supabase';
import type { Json, TableRow } from '@/types/database';
import type {
  AccessItemType, AdminActivityLog, BiometricDevice, BiometricEventResult, ChurchGroup, ConventionEvent,
  FingerprintFinger, ManagedListEntity, ManagedListItem, Programme, RegistrationKind, RegistrationLink, TimetableSession,
  VerificationMethod, Workspace, WorkspaceMember, WorkspaceRole,
} from '@/types';

export type AttendeeRow = TableRow<'attendees'>;
export type AttendanceRow = TableRow<'attendance'>;
export type BiometricEventRow = TableRow<'biometric_events'>;
export type AttendeeDepartmentRow = TableRow<'attendee_departments'>;
export type AccessClaimRow = TableRow<'access_claims'>;
export type EnrollmentRow = TableRow<'fingerprint_enrollments'>;

const PAGE = 1000;

function fail(error: unknown): never {
  throw new Error(errorMessage(error));
}

/** Reads every row of a query, 1000 at a time (PostgREST caps responses at 1000 rows). */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) fail(error);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export function mapWorkspace(row: TableRow<'workspaces'>): Workspace {
  return { id: row.id, name: row.name, slug: row.slug, codePrefix: row.code_prefix, timezone: row.timezone, isActive: row.is_active, ownerId: row.owner_id };
}

export function mapEvent(row: TableRow<'events'>): ConventionEvent {
  return {
    id: row.id, workspaceId: row.workspace_id, name: row.name, theme: row.theme ?? '', scripture: row.scripture ?? '',
    description: row.description ?? '', venue: row.venue ?? '', startDate: row.start_date, endDate: row.end_date,
    maxAttendees: row.max_attendees, isActive: row.is_active,
  };
}

function mapListItem(row: { id: string; name: string; is_active: boolean; sort_order: number; color?: string | null }): ManagedListItem {
  return { id: row.id, name: row.name, active: row.is_active, sortOrder: row.sort_order, color: row.color ?? null };
}

function mapGroup(row: TableRow<'convention_groups'>): ChurchGroup {
  return { ...mapListItem(row), autoAssign: row.auto_assign, forUnbanded: row.for_unbanded };
}

function mapProgramme(row: TableRow<'programmes'>): Programme {
  return {
    id: row.id, title: row.title, description: row.description, date: row.date,
    startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5), location: row.location ?? '',
    active: row.is_active, sortOrder: row.sort_order,
  };
}

export function mapDevice(row: TableRow<'biometric_devices'>): BiometricDevice {
  return {
    id: row.id, name: row.name, vendor: row.vendor, model: row.model, serialNumber: row.serial_number,
    connectionType: row.connection_type, serviceUrl: row.service_url, status: row.status,
    lastHeartbeat: row.last_heartbeat_at, isActive: row.is_active,
  };
}

export function mapActivity(row: TableRow<'activity_log'>): AdminActivityLog {
  return { id: row.id, actorName: row.actor_name ?? 'Public registration', action: row.action, target: row.target, createdAt: row.created_at };
}

export function mapLink(row: TableRow<'registration_links'>): RegistrationLink {
  const expired = (row.expires_at && new Date(row.expires_at) <= new Date()) || (row.max_uses !== null && row.uses >= row.max_uses);
  return {
    id: row.id, type: row.kind, token: row.token, url: registrationUrl(row.kind, row.token), label: row.label ?? '',
    uses: row.uses, maxUses: row.max_uses, expiresAt: row.expires_at, createdAt: row.created_at,
    status: !row.is_active ? 'inactive' : expired ? 'expired' : 'active',
  };
}

// ---------------------------------------------------------------------------
// Workspace / event
// ---------------------------------------------------------------------------

export async function fetchWorkspaces() {
  const { data, error } = await supabase.from('workspaces').select('*').order('name');
  if (error) fail(error);
  return (data ?? []).map(mapWorkspace);
}

export async function fetchEvents(workspaceId: string) {
  const { data, error } = await supabase.from('events').select('*').eq('workspace_id', workspaceId).order('start_date', { ascending: false });
  if (error) fail(error);
  return (data ?? []).map(mapEvent);
}

export async function fetchEventConfig(eventId: string) {
  const [bands, departments, groups, locations, programmes, leadershipRoles] = await Promise.all([
    supabase.from('bands').select('*').eq('event_id', eventId).order('sort_order'),
    supabase.from('departments').select('*').eq('event_id', eventId).order('sort_order'),
    supabase.from('convention_groups').select('*').eq('event_id', eventId).order('sort_order'),
    supabase.from('church_locations').select('*').eq('event_id', eventId).order('sort_order'),
    supabase.from('programmes').select('*').eq('event_id', eventId).order('date').order('start_time'),
    supabase.from('leadership_roles').select('*').eq('event_id', eventId).order('sort_order'),
  ]);
  for (const result of [bands, departments, groups, locations, programmes, leadershipRoles]) if (result.error) fail(result.error);
  return {
    bands: (bands.data ?? []).map(mapListItem),
    departments: (departments.data ?? []).map(mapListItem),
    churchGroups: (groups.data ?? []).map(mapGroup),
    churchLocations: (locations.data ?? []).map(mapListItem),
    programmes: (programmes.data ?? []).map(mapProgramme),
    leadershipRoles: (leadershipRoles.data ?? []).map(mapListItem),
  };
}

export async function saveEvent(workspaceId: string, event: Partial<ConventionEvent> & Pick<ConventionEvent, 'name' | 'startDate' | 'endDate'>) {
  const values = {
    workspace_id: workspaceId,
    name: event.name.trim(),
    theme: event.theme?.trim() || null,
    scripture: event.scripture?.trim() || null,
    description: event.description?.trim() || null,
    venue: event.venue?.trim() || null,
    start_date: event.startDate,
    end_date: event.endDate,
    max_attendees: event.maxAttendees || null,
  };
  const query = event.id
    ? supabase.from('events').update(values).eq('id', event.id).select().single()
    : supabase.from('events').insert(values).select().single();
  const { data, error } = await query;
  if (error) fail(error);
  return mapEvent(data);
}

export async function activateEvent(eventId: string) {
  const { error } = await supabase.rpc('activate_event', { p_event: eventId });
  if (error) fail(error);
}

const LIST_TABLES = {
  bands: 'bands',
  departments: 'departments',
  churchGroups: 'convention_groups',
  churchLocations: 'church_locations',
  leadershipRoles: 'leadership_roles',
} as const;

export async function saveListItem(
  entity: ManagedListEntity, workspaceId: string, eventId: string,
  item: Partial<ChurchGroup> & Pick<ManagedListItem, 'name'>,
) {
  const table = LIST_TABLES[entity];
  const values: Record<string, unknown> = {
    workspace_id: workspaceId, event_id: eventId, name: item.name.trim(),
    is_active: item.active ?? true, sort_order: item.sortOrder ?? 0,
  };
  if (entity === 'bands' || entity === 'churchGroups') values.color = item.color ?? null;
  if (entity === 'churchGroups') {
    values.auto_assign = item.autoAssign ?? true;
    values.for_unbanded = item.forUnbanded ?? false;
  }
  const { error } = item.id
    ? await supabase.from(table).update(values as never).eq('id', item.id)
    : await supabase.from(table).insert(values as never);
  if (error) {
    if ((error as { code?: string }).code === '23505') throw new Error(`"${item.name.trim()}" already exists (or another group is already used for members without a band).`);
    fail(error);
  }
}

/** Deletes a list item, or deactivates it when attendees still reference it. */
export async function deleteListItem(entity: ManagedListEntity, id: string) {
  const table = LIST_TABLES[entity];
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (!error) return { ok: true as const };
  if ((error as { code?: string }).code === '23503') {
    const { error: updateError } = await supabase.from(table).update({ is_active: false } as never).eq('id', id);
    if (updateError) fail(updateError);
    return { ok: false as const, message: 'This item is in use and was deactivated instead.' };
  }
  fail(error);
}

export async function saveProgramme(workspaceId: string, eventId: string, programme: Partial<Programme> & Pick<Programme, 'title' | 'date' | 'startTime' | 'endTime'>) {
  const values = {
    workspace_id: workspaceId, event_id: eventId, title: programme.title.trim(), description: programme.description?.trim() ?? '',
    date: programme.date, start_time: programme.startTime, end_time: programme.endTime, location: programme.location?.trim() || null,
    is_active: programme.active ?? true, sort_order: programme.sortOrder ?? 0,
  };
  const { error } = programme.id
    ? await supabase.from('programmes').update(values).eq('id', programme.id)
    : await supabase.from('programmes').insert(values);
  if (error) fail(error);
}

export async function deleteProgramme(id: string) {
  const { error } = await supabase.from('programmes').delete().eq('id', id);
  if (error) fail(error);
}

// ---------------------------------------------------------------------------
// Attendees and live data
// ---------------------------------------------------------------------------

export async function fetchAttendeeData(eventId: string) {
  const [attendees, departments, claims] = await Promise.all([
    fetchAll<AttendeeRow>((from, to) => supabase.from('attendees').select('*').eq('event_id', eventId).order('registered_at', { ascending: false }).range(from, to)),
    fetchAll<AttendeeDepartmentRow>((from, to) => supabase.from('attendee_departments').select('*').eq('event_id', eventId).range(from, to)),
    fetchAll<AccessClaimRow>((from, to) => supabase.from('access_claims').select('*').eq('event_id', eventId).range(from, to)),
  ]);
  return { attendees, departments, claims };
}

/** Everything about one attendee, used to patch local state after an action (a few hundred bytes). */
export async function fetchAttendeeSnapshot(attendeeId: string) {
  const [attendee, departments, claims, attendance] = await Promise.all([
    supabase.from('attendees').select('*').eq('id', attendeeId).maybeSingle(),
    supabase.from('attendee_departments').select('*').eq('attendee_id', attendeeId),
    supabase.from('access_claims').select('*').eq('attendee_id', attendeeId),
    supabase.from('attendance').select('*').eq('attendee_id', attendeeId),
  ]);
  for (const result of [attendee, departments, claims, attendance]) if (result.error) fail(result.error);
  return {
    attendee: attendee.data as AttendeeRow | null,
    departments: (departments.data ?? []) as AttendeeDepartmentRow[],
    claims: (claims.data ?? []) as AccessClaimRow[],
    attendance: (attendance.data ?? []) as AttendanceRow[],
  };
}

export async function fetchAttendance(eventId: string) {
  return fetchAll<AttendanceRow>((from, to) => supabase.from('attendance').select('*').eq('event_id', eventId).order('checked_in_at', { ascending: false }).range(from, to));
}

export async function fetchBiometricEvents(eventId: string, limit = 200) {
  const { data, error } = await supabase.from('biometric_events').select('*').eq('event_id', eventId).order('created_at', { ascending: false }).limit(limit);
  if (error) fail(error);
  return data ?? [];
}

export async function fetchActivity(workspaceId: string, limit = 100) {
  const { data, error } = await supabase.from('activity_log').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(limit);
  if (error) fail(error);
  return (data ?? []).map(mapActivity);
}

export async function fetchLinks(eventId: string) {
  const { data, error } = await supabase.from('registration_links').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) fail(error);
  return (data ?? []).map(mapLink);
}

export async function fetchDevices(workspaceId: string) {
  const { data, error } = await supabase.from('biometric_devices').select('*').eq('workspace_id', workspaceId).order('created_at');
  if (error) fail(error);
  return (data ?? []).map(mapDevice);
}

export async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase.rpc('list_workspace_members', { p_workspace: workspaceId });
  if (error) fail(error);
  return (data ?? []).map(row => ({ userId: row.user_id, email: row.email, name: row.name, role: row.role, assignedAt: row.assigned_at }));
}

export async function createRegistrationLink(workspaceId: string, eventId: string, kind: RegistrationKind, options: { label?: string; maxUses?: number | null; expiresAt?: string | null } = {}) {
  const { data, error } = await supabase.from('registration_links').insert({
    workspace_id: workspaceId, event_id: eventId, kind,
    label: options.label?.trim() || null, max_uses: options.maxUses ?? null, expires_at: options.expiresAt ?? null,
  }).select().single();
  if (error) fail(error);
  return mapLink(data);
}

export async function setRegistrationLinkActive(id: string, active: boolean) {
  const { error } = await supabase.from('registration_links').update({ is_active: active }).eq('id', id);
  if (error) fail(error);
}

export interface AttendeePatch { leadershipRole?: string; firstTimerFollowedUp?: boolean; groupId?: string | null }

export async function updateAttendee(id: string, patch: AttendeePatch) {
  const values: { leadership_role?: string; first_timer_followed_up?: boolean; group_id?: string | null } = {};
  if (patch.leadershipRole !== undefined) values.leadership_role = patch.leadershipRole;
  if (patch.firstTimerFollowedUp !== undefined) values.first_timer_followed_up = patch.firstTimerFollowedUp;
  if (patch.groupId !== undefined) values.group_id = patch.groupId;
  const { error } = await supabase.from('attendees').update(values).eq('id', id);
  if (error) fail(error);
}

/** Replaces an attendee's departments (admins and the registration desk). */
export async function setAttendeeDepartments(scope: { workspaceId: string; eventId: string }, attendeeId: string, current: string[], next: string[]) {
  const removed = current.filter(id => !next.includes(id));
  const added = next.filter(id => !current.includes(id));
  if (removed.length) {
    const { error } = await supabase.from('attendee_departments').delete().eq('attendee_id', attendeeId).in('department_id', removed);
    if (error) fail(error);
  }
  if (added.length) {
    const { error } = await supabase.from('attendee_departments').insert(added.map(departmentId => ({
      attendee_id: attendeeId, department_id: departmentId, event_id: scope.eventId, workspace_id: scope.workspaceId,
    })));
    if (error) fail(error);
  }
}

export async function deleteAttendee(id: string, photoPath?: string | null) {
  const { error } = await supabase.from('attendees').delete().eq('id', id);
  if (error) fail(error);
  if (photoPath) await supabase.storage.from('attendee-photos').remove([photoPath]);
}

export async function recordManualCheckIn(workspaceId: string, eventId: string, attendeeId: string, attendanceDate: string, userId: string, method: Exclude<VerificationMethod, 'biometric'> = 'manual', programmeId?: string | null) {
  const { error } = await supabase.from('attendance').insert({
    workspace_id: workspaceId, event_id: eventId, attendee_id: attendeeId, attendance_date: attendanceDate,
    method, programme_id: programmeId ?? null, recorded_by: userId,
  });
  if (error) {
    if ((error as { code?: string }).code === '23505') throw new Error('This attendee has already checked in today.');
    fail(error);
  }
}

// ---------------------------------------------------------------------------
// Fingerprint / access RPCs
// ---------------------------------------------------------------------------

export async function fetchEnrollments(attendeeId: string) {
  const { data, error } = await supabase.from('fingerprint_enrollments').select('*').eq('attendee_id', attendeeId).is('revoked_at', null);
  if (error) fail(error);
  return data ?? [];
}

export async function enrollFingerprint(input: {
  attendeeId: string; finger: FingerprintFinger; template: string; imageQuality?: number; nfiq?: number; deviceId?: string | null; consent: boolean;
}) {
  const { data, error } = await supabase.rpc('enroll_fingerprint', {
    p_attendee: input.attendeeId, p_finger: input.finger, p_template: input.template, p_template_format: 'ISO19794',
    p_image_quality: input.imageQuality, p_nfiq: input.nfiq, p_device: input.deviceId ?? undefined, p_consent: input.consent,
  });
  if (error) fail(error);
  return data;
}

export async function recordBiometricVerification(input: {
  attendeeId: string; result: BiometricEventResult; matchScore?: number; threshold?: number; enrollmentId?: string;
  deviceId?: string | null; programmeId?: string | null; message?: string;
}) {
  const { data, error } = await supabase.rpc('record_biometric_verification', {
    p_attendee: input.attendeeId, p_result: input.result, p_match_score: input.matchScore, p_threshold: input.threshold,
    p_enrollment: input.enrollmentId, p_device: input.deviceId ?? undefined, p_programme: input.programmeId ?? undefined,
    p_message: input.message,
  });
  if (error) fail(error);
  return data as { ok: boolean; duplicate: boolean; message: string };
}

export interface QrCheckInResult { ok: boolean; already: boolean; message: string; checkedInAt?: string }

/** Check-in from a scanned tag QR (once per day, or per session when one is chosen). */
export async function qrCheckIn(attendeeId: string, date: string, programmeId?: string | null) {
  const { data, error } = await supabase.rpc('qr_check_in', { p_attendee: attendeeId, p_date: date, p_programme: programmeId ?? null });
  if (error) fail(error);
  return data as unknown as QrCheckInResult;
}

export async function claimAccessItem(attendeeId: string, item: AccessItemType) {
  const { data, error } = await supabase.rpc('claim_access_item', { p_attendee: attendeeId, p_item: item });
  if (error) fail(error);
  return data as { ok: boolean; message: string };
}

export async function purgeEventFingerprints(eventId: string) {
  const { data, error } = await supabase.rpc('purge_event_fingerprints', { p_event: eventId });
  if (error) fail(error);
  return data;
}

export async function saveDevice(workspaceId: string, device: Partial<BiometricDevice> & Pick<BiometricDevice, 'name'>) {
  const values = {
    workspace_id: workspaceId, name: device.name.trim(), serial_number: device.serialNumber?.trim() || null,
    service_url: device.serviceUrl?.trim() || 'https://localhost:8443', is_active: device.isActive ?? true,
  };
  const { error } = device.id
    ? await supabase.from('biometric_devices').update(values).eq('id', device.id)
    : await supabase.from('biometric_devices').insert(values);
  if (error) fail(error);
}

export async function reportDeviceStatus(id: string, status: BiometricDevice['status'], userId: string) {
  const { error } = await supabase.from('biometric_devices').update({
    status, last_seen_by: userId, ...(status === 'online' ? { last_heartbeat_at: new Date().toISOString() } : {}),
  }).eq('id', id);
  if (error) fail(error);
}

export async function deleteDevice(id: string) {
  const { error } = await supabase.from('biometric_devices').delete().eq('id', id);
  if (error) fail(error);
}

// ---------------------------------------------------------------------------
// Roles and workspaces
// ---------------------------------------------------------------------------

export async function revokeWorkspaceRole(workspaceId: string, userId: string, role: WorkspaceRole) {
  const { error } = await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId).eq('user_id', userId).eq('role', role);
  if (error) fail(error);
}

export interface InviteResult {
  /** existing: login already existed; invited: invite email sent; link: email failed, share actionLink privately. */
  status: 'existing' | 'invited' | 'link';
  actionLink?: string;
  emailError?: string;
  workspaceId?: string;
}

/** Calls the invite-staff Edge Function and surfaces its error message. */
async function invokeInvite(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke<InviteResult>('invite-staff', {
    body: { ...body, redirectTo: appBaseUrl() },
  });
  if (error) {
    const context = (error as { context?: Response }).context;
    let message = error.message;
    if (context && typeof context.json === 'function') {
      try { message = ((await context.json()) as { error?: string }).error ?? message; } catch { /* keep default */ }
    }
    throw new Error(message);
  }
  if (!data) throw new Error('No response from the invite service.');
  return data;
}

/** Gives someone a role in a workspace, creating and inviting their login if needed. */
export function inviteStaff(input: { workspaceId: string; email: string; role: WorkspaceRole; name?: string }) {
  return invokeInvite({ action: 'assign_role', ...input });
}

/** Platform admin: creates a workspace and invites its admin in one step. */
export function createWorkspace(input: { name: string; slug: string; ownerEmail: string; ownerName?: string; codePrefix: string }) {
  return invokeInvite({
    action: 'create_workspace', workspaceName: input.name, slug: input.slug, codePrefix: input.codePrefix,
    email: input.ownerEmail, name: input.ownerName,
  });
}

// ---------------------------------------------------------------------------
// Public (no login)
// ---------------------------------------------------------------------------

export interface RegistrationForm {
  kind: RegistrationKind;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  codePrefix: string;
  event: { id: string; name: string; theme: string | null; scripture: string | null; venue: string | null; startDate: string; endDate: string };
  photoPathPrefix: string;
  bands: { id: string; name: string; color: string | null }[];
  departments: { id: string; name: string }[];
  churchLocations: { id: string; name: string }[];
  groups: { id: string; name: string; forUnbanded: boolean }[];
  /** Admin-defined roles; empty means executives type their role. */
  leadershipRoles: { id: string; name: string }[];
}

export async function getRegistrationForm(token: string) {
  const { data, error } = await supabase.rpc('get_registration_form', { p_token: token });
  if (error) fail(error);
  return (data as unknown as RegistrationForm | null) ?? null;
}

export interface RegistrationPayload {
  fullName: string; email: string; phoneNumber: string; gender?: string; dateOfBirth?: string; address?: string;
  occupation?: string; emergencyContact?: string; churchLocationId?: string | null; bandId?: string | null;
  departmentIds?: string[]; isFirstTimer?: boolean; wantsPermanentMembership?: boolean | null; invitedBy?: string;
  leadershipRole?: string; photoPath?: string | null;
}

export interface RegistrationResult {
  id: string; code: string; kind: RegistrationKind; statusToken: string; groupName: string | null; registeredAt: string;
}

export async function registerAttendee(token: string, payload: RegistrationPayload) {
  const { data, error } = await supabase.rpc('register_attendee', { p_token: token, p_payload: payload as unknown as Json });
  if (error) fail(error);
  return data as unknown as RegistrationResult;
}

export interface AttendeeStatus {
  kind: RegistrationKind;
  code: string;
  fullName: string;
  leadershipRole: string | null;
  bandName: string | null;
  groupName: string | null;
  departments: string[];
  photoPath: string | null;
  registeredAt: string;
  biometricVerified: boolean;
  lastVerifiedAt: string | null;
  event: { name: string; theme: string | null; venue: string | null; startDate: string; endDate: string };
  workspaceName: string;
  workspaceSlug: string;
  accessClaims: Partial<Record<AccessItemType, string>>;
  attendance: { date: string; checkedInAt: string; programme: string | null }[];
  programmes: TimetableSession[];
}

export interface EventTimetable {
  workspaceName: string;
  workspaceSlug: string;
  event: { name: string; theme: string | null; scripture: string | null; venue: string | null; startDate: string; endDate: string };
  programmes: TimetableSession[];
}

/** Public timetable of a workspace's active convention (null when there is none). */
export async function getEventTimetable(workspaceSlug: string) {
  const { data, error } = await supabase.rpc('get_event_timetable', { p_workspace_slug: workspaceSlug });
  if (error) fail(error);
  return (data as unknown as EventTimetable | null) ?? null;
}

export async function getAttendeeStatus(token: string) {
  const { data, error } = await supabase.rpc('get_attendee_status', { p_token: token });
  if (error) fail(error);
  return (data as unknown as AttendeeStatus | null) ?? null;
}

export async function findAttendeeStatus(workspaceSlug: string, query: string) {
  const { data, error } = await supabase.rpc('find_attendee_status', { p_workspace_slug: workspaceSlug, p_query: query });
  if (error) fail(error);
  return data ?? [];
}
