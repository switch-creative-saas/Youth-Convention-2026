import type { WorkspaceRole } from '@/types';

// UI gating only; the database (RLS + SECURITY DEFINER functions) is the authority.
export type Permission = 'view' | 'manage' | 'register' | 'verify' | 'claim_food' | 'claim_souvenir' | 'record_activity';

export const PERMISSION_ROLES: Record<Permission, WorkspaceRole[]> = {
  view: ['registration_desk', 'verification_operator', 'food_distributor', 'souvenir_distributor', 'activity_coordinator', 'viewer'],
  manage: [],
  register: ['registration_desk'],
  verify: ['verification_operator'],
  claim_food: ['food_distributor'],
  claim_souvenir: ['souvenir_distributor'],
  record_activity: ['activity_coordinator'],
};

export function hasPermission(roles: WorkspaceRole[], permission: Permission) {
  return roles.includes('admin') || roles.some(role => PERMISSION_ROLES[permission].includes(role));
}
