export type FellowshipBand = 'Peniel' | 'Judah' | 'Zion' | 'Ephraim' | 'None';
export type ConventionGroup = 'Group A' | 'Group B' | 'Group C' | 'Group D' | 'Group E';
export type Department = 'Choir' | 'Ushering' | 'Media' | 'Protocol' | 'Drama' | 'Prayer' | 'Technical' | 'Dance' | 'Evangelism' | 'Welfare' | 'Decoration' | 'Security' | 'Sanitation' | 'None';
export type UserRole = 'super_admin' | 'admin' | 'executive' | 'member';
export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type VerificationMethod = 'biometric' | 'qr_code' | 'manual';
export type AttendanceStatus = 'present' | 'absent';
export type BiometricStatus = 'pending_verification' | 'fingerprint_enrolled' | 'verified_checked_in' | 'duplicate_attempt';
export type ScannerStatus = 'online' | 'offline' | 'connecting' | 'error';
export type AccessItemType = 'food' | 'souvenir' | 'entry' | 'activity';
export type AdminActionType = 'attendance' | 'registration' | 'verification' | 'access' | 'role';

export interface RecordMetadata {
  eventId?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface ConventionEvent extends RecordMetadata {
  id: string;
  eventId?: string;
  name: string;
  theme: string;
  scripture?: string;
  startDate: string;
  endDate: string;
  venue: string;
  description?: string;
  maxAttendees: number;
  active: boolean;
}

export interface ManagedListItem extends RecordMetadata {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}
export type Band = ManagedListItem;
export type DepartmentItem = ManagedListItem;
export type ChurchGroup = ManagedListItem;
export type ChurchLocation = ManagedListItem;
export interface Programme extends RecordMetadata {
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
export type ConventionRoleName = 'registration_desk' | 'verification_operator' | 'food_distributor' | 'souvenir_distributor' | 'activity_coordinator' | 'viewer';
export interface ConventionRole extends RecordMetadata {
  id: string;
  userEmail: string;
  role: ConventionRoleName;
  assignedBy: string;
  assignedAt: string;
}

export interface Member extends RecordMetadata {
  id: string;
  statusToken?: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  address: string;
  occupation: string;
  emergencyContact: string;
  churchBranch: string;
  profilePhoto?: string;
  fellowshipBand: FellowshipBand;
  departments: Department[];
  isFirstTimer: boolean;
  wantsPermanentMembership: boolean | null;
  conventionGroup: ConventionGroup;
  registeredAt: string;
  qrCode: string;
  biometricStatus?: BiometricStatus;
  fingerprintTemplateId?: string;
  lastVerifiedAt?: string;
  accessClaims?: Partial<Record<AccessItemType, string>>;
}

export interface Executive extends RecordMetadata {
  id: string;
  statusToken?: string;
  fullName: string;
  leadershipRole: string;
  department: Department;
  fellowshipBand: FellowshipBand;
  phoneNumber: string;
  email: string;
  address: string;
  profilePhoto?: string;
  registeredAt: string;
  registrationStatus?: 'executive' | 'admin';
  adminGrantedAt?: string;
  adminRevokedAt?: string;
  accessClaims?: Partial<Record<AccessItemType, string>>;
  lastLogin?: string;
}

export interface AttendanceRecord extends RecordMetadata {
  id: string;
  memberId: string;
  memberName: string;
  checkInTime: string;
  verificationMethod: VerificationMethod;
  status: AttendanceStatus;
  sessionName: string;
}

export interface BiometricLog extends RecordMetadata {
  id: string;
  memberId?: string;
  memberName?: string;
  scannerId: string;
  status: 'success' | 'failed' | 'duplicate';
  message: string;
  createdAt: string;
}

export interface BiometricDevice extends RecordMetadata {
  id: string;
  name: string;
  vendor: 'Digital Persona' | 'SecuGen' | 'ZKTeco' | 'Suprema' | 'Nitgen' | 'SDK Bridge';
  connectionType: 'USB' | 'Network' | 'WebSocket Bridge';
  status: ScannerStatus;
  lastHeartbeat: string;
}

export interface AdminActivityLog extends RecordMetadata {
  id: string;
  actorEmail: string;
  actorName: string;
  action: AdminActionType;
  target: string;
  createdAt: string;
}

export interface FirstTimer extends RecordMetadata {
  id: string;
  fullName: string;
  phoneNumber: string;
  gender: 'Male' | 'Female';
  invitedBy?: string;
  wantsPermanentMembership: boolean;
  dateVisited: string;
  followedUp: boolean;
}

export interface ConventionSession extends RecordMetadata {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
}

export interface ConventionSettings extends RecordMetadata {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  theme: string;
  scripture?: string;
  isActive: boolean;
  maxAttendees: number;
  sessions: ConventionSession[];
}

export interface GeneratedLink extends RecordMetadata {
  id: string;
  type: 'member' | 'executive';
  url: string;
  token: string;
  createdAt: string;
  uses: number;
  status: 'active' | 'expired';
}

export interface StoredAuthUser {
  email: string;
  password: string;
  user: User;
}

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

export interface User {
  email: string;
  name: string;
  role: UserRole;
}

export const BAND_COLORS: Record<FellowshipBand, string> = {
  Peniel: '#2563EB',
  Judah: '#6C5CE7',
  Zion: '#10B981',
  Ephraim: '#F59E0B',
  None: '#94A3B8',
};

export const GROUP_COLORS: Record<ConventionGroup, string> = {
  'Group A': '#EF4444',
  'Group B': '#2563EB',
  'Group C': '#10B981',
  'Group D': '#F59E0B',
  'Group E': '#94A3B8',
};

export const EXECUTIVE_ROLES = [
  'President', 'Vice President', 'Secretary', 'Assistant Secretary',
  'Financial Secretary', 'Prayer Coordinator', 'Choir Director',
  'Welfare Coordinator', 'Evangelism Coordinator', 'Technical Director',
  'Media Director', 'Youth Pastor', 'Other',
];
