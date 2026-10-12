import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { hasPermission, type Permission } from '@/lib/permissions';

/** Client-side convention-role gate. Supabase RLS will enforce this server-side later. */
export function usePermission(permission: Permission) {
  const { user } = useAuth();
  const { conventionRoles } = useAppData();

  if (user?.role === 'super_admin' || user?.role === 'admin') return true;
  if (!user?.email) return false;

  return hasPermission(
    conventionRoles
      .filter(role => role.userEmail.toLowerCase() === user.email.toLowerCase())
      .map(role => role.role),
    permission,
  );
}
