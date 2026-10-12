import type { Database } from './database';

type Enums = Database['public']['Enums'];

export type WorkspaceRole = Enums['workspace_role'];
export type AccessItemType = Enums['access_item'];
export type BiometricStatus = Enums['biometric_status'];
export type BiometricEventResult = Enums['biometric_event_result'];
export type BiometricEventKind = Enums['biometric_event_kind'];
export type VerificationMethod = Enums['verification_method'];
export type RegistrationKind = Enums['registration_kind'];
export type FingerprintFinger = Enums['fingerprint_finger'];
export type ScannerStatus = Enums['device_status'];
export type AdminActionType = Enums['activity_action'];
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/** super_admin = platform admin (system owner); admin = workspace admin; staff = any other workspace role. */
export type UserRole = 'super_admin' | 'admin' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  codePrefix: string;
  timezone: string;
  isActive: boolean;
}

export interface ConventionEvent {
  id: string;
  workspaceId: string;
  name: string;
  theme: string;
  scripture: string;
  description: string;
  venue: string;
  startDate: string;
  endDate: string;
  maxAttendees: number | null;
  isActive: boolean;
}

export interface ManagedListItem {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
  color?: string | null;
}
export type Band = ManagedListItem;
export type DepartmentItem = ManagedListItem;
export type ChurchLocation = ManagedListItem;
export type LeadershipRole = ManagedListItem;
export interface ChurchGroup extends ManagedListItem {
  autoAssign: boolean;
  forUnbanded: boolean;
}
export type ManagedListEntity = 'bands' | 'departments' | 'churchGroups' | 'churchLocations' | 'leadershipRoles';

export interface Programme {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  active: boolean;
  sortOrder: number;
}

/** Members and executives share one record shape (attendees table). */
export interface Attendee {
  id: string;
  kind: RegistrationKind;
  code: string;
  statusToken: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: 'Male' | 'Female' | null;
  dateOfBirth: string | null;
  address: string;
  occupation: string;
  emergencyContact: string;
  churchLocationId: string | null;
  churchBranch: string;
  bandId: string | null;
  fellowshipBand: string;
  groupId: string | null;
  conventionGroup: string;
  departmentIds: string[];
  departments: string[];
  leadershipRole: string;
  photoPath: string | null;
  profilePhoto?: string;
  isFirstTimer: boolean;
  wantsPermanentMembership: boolean | null;
  invitedBy: string;
  firstTimerFollowedUp: boolean;
  biometricStatus: BiometricStatus;
  biometricConsentAt: string | null;
  lastVerifiedAt: string | null;
  registeredAt: string;
  confirmationEmailSentAt: string | null;
  confirmationEmailError: string | null;
  accessClaims: Partial<Record<AccessItemType, string>>;
}
export type Member = Attendee;
export type Executive = Attendee;

export interface AttendanceRecord {
  id: string;
  attendeeId: string;
  attendeeName: string;
  attendeeCode: string;
  checkInTime: string;
  attendanceDate: string;
  verificationMethod: VerificationMethod;
  programmeId: string | null;
  sessionName: string;
}

export interface BiometricLog {
  id: string;
  attendeeId: string | null;
  attendeeName: string | null;
  deviceId: string | null;
  kind: BiometricEventKind;
  status: BiometricEventResult;
  matchScore: number | null;
  message: string;
  createdAt: string;
}

export interface BiometricDevice {
  id: string;
  name: string;
  vendor: string;
  model: string;
  serialNumber: string | null;
  connectionType: string;
  serviceUrl: string;
  status: ScannerStatus;
  lastHeartbeat: string | null;
  isActive: boolean;
}

export interface AdminActivityLog {
  id: number;
  actorName: string;
  action: AdminActionType;
  target: string;
  createdAt: string;
}

export interface RegistrationLink {
  id: string;
  type: RegistrationKind;
  token: string;
  url: string;
  label: string;
  uses: number;
  maxUses: number | null;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'inactive';
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  assignedAt: string;
}

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  admin: 'Admin',
  registration_desk: 'Registration desk',
  verification_operator: 'Verification operator',
  food_distributor: 'Food distributor',
  souvenir_distributor: 'Souvenir distributor',
  activity_coordinator: 'Activity coordinator',
  viewer: 'Viewer',
};
