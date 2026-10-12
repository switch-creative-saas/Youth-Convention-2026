import type { ConventionRoleName } from '@/types';

export type Permission = 'register' | 'verify' | 'claim_food' | 'claim_souvenir' | 'record_activity' | 'view_analytics' | 'export';
export const ROLE_PERMISSIONS: Record<ConventionRoleName, Permission[]> = {
  registration_desk: ['register'],
  verification_operator: ['verify'],
  food_distributor: ['claim_food'],
  souvenir_distributor: ['claim_souvenir'],
  activity_coordinator: ['record_activity'],
  viewer: ['view_analytics'],
};
// TODO: move permission enforcement to Supabase row-level security.
export function hasPermission(roles: ConventionRoleName[], permission: Permission) {
  return roles.some(role => ROLE_PERMISSIONS[role].includes(permission));
}
