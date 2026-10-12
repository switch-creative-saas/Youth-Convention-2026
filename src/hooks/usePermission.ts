import { useAppData } from '@/contexts/AppDataContext';
import { hasPermission, type Permission } from '@/lib/permissions';

/** Client-side gate for the current workspace. Supabase RLS enforces the same rules server-side. */
export function usePermission(permission: Permission) {
  const { myRoles } = useAppData();
  return hasPermission(myRoles, permission);
}
