import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { appBaseUrl, errorMessage, pendingAuthLink, supabase } from '@/lib/supabase';
import type { User, UserRole, WorkspaceRole } from '@/types';

export interface Membership {
  workspaceId: string;
  role: WorkspaceRole;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isPlatformAdmin: boolean;
  memberships: Membership[];
  isLoading: boolean;
  /** Set after the user opens an email link: invite/recovery must choose a password; magiclink may skip. */
  passwordRecovery: PasswordSetupKind;
  /** Error carried back on an expired or invalid email link. */
  authLinkError: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Leaves the optional set-password screen shown after a magic-link sign-in. */
  dismissPasswordSetup: () => void;
}

export type PasswordSetupKind = false | 'invite' | 'recovery' | 'magiclink';

function setupKindFromLink(): PasswordSetupKind {
  if (!pendingAuthLink?.accessToken) return false;
  const type = pendingAuthLink.type;
  return type === 'invite' || type === 'recovery' || type === 'magiclink' ? type : false;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadProfile(session: Session) {
  const authUser = session.user;
  const [{ data: platform, error: platformError }, { data: rows, error: membershipError }] = await Promise.all([
    supabase.from('platform_admins').select('user_id').eq('user_id', authUser.id).maybeSingle(),
    supabase.from('workspace_members').select('workspace_id, role').eq('user_id', authUser.id),
  ]);
  if (platformError) throw platformError;
  if (membershipError) throw membershipError;

  const memberships: Membership[] = (rows ?? []).map(row => ({ workspaceId: row.workspace_id, role: row.role }));
  const isPlatformAdmin = Boolean(platform);
  const role: UserRole | null = isPlatformAdmin
    ? 'super_admin'
    : memberships.some(m => m.role === 'admin') ? 'admin'
    : memberships.length ? 'staff'
    : null;
  const metadataName = typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name : '';
  const user: User | null = role ? {
    id: authUser.id,
    email: authUser.email ?? '',
    name: metadataName || authUser.email || 'Admin',
    role,
  } : null;
  return { user, role, memberships, isPlatformAdmin };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState<PasswordSetupKind>(setupKindFromLink);
  const [authLinkError, setAuthLinkError] = useState(() => pendingAuthLink?.error ?? null);

  const applySession = useCallback(async (next: Session | null) => {
    setSession(next);
    if (!next) {
      setUser(null); setRole(null); setMemberships([]); setIsPlatformAdmin(false);
      setIsLoading(false);
      return null;
    }
    try {
      const profile = await loadProfile(next);
      setUser(profile.user); setRole(profile.role); setMemberships(profile.memberships); setIsPlatformAdmin(profile.isPlatformAdmin);
      return profile;
    } catch (error) {
      console.error('Unable to load profile', error);
      setUser(null); setRole(null); setMemberships([]); setIsPlatformAdmin(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const start = async () => {
      if (pendingAuthLink?.accessToken && pendingAuthLink.refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: pendingAuthLink.accessToken, refresh_token: pendingAuthLink.refreshToken });
        if (error) {
          // Expired or already-used link: skip the password screen and explain on the login page.
          setPasswordRecovery(false);
          setAuthLinkError('the link is invalid or has expired');
        }
      }
      const { data } = await supabase.auth.getSession();
      await applySession(data.session);
    };
    void start();
    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery('recovery');
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
        // Defer: Supabase calls inside this callback can deadlock the auth lock.
        window.setTimeout(() => { void applySession(next); }, 0);
      } else {
        setSession(next);
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, [applySession]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error || !data.session) return { success: false, error: error?.message ?? 'Sign in failed.' };
    setIsLoading(true);
    const profile = await applySession(data.session);
    if (!profile?.role) {
      await supabase.auth.signOut();
      return { success: false, error: 'This account has not been given access to any convention dashboard.' };
    }
    return { success: true, role: profile.role };
  }, [applySession]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setPasswordRecovery(false);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: appBaseUrl() });
    if (error) throw new Error(errorMessage(error));
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(errorMessage(error));
    setPasswordRecovery(false);
  }, []);

  const dismissPasswordSetup = useCallback(() => setPasswordRecovery(false), []);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await applySession(data.session);
  }, [applySession]);

  return (
    <AuthContext.Provider value={{
      user: session ? user : null, role, isPlatformAdmin, memberships, isLoading, passwordRecovery, authLinkError,
      login, logout, requestPasswordReset, updatePassword, refreshProfile, dismissPasswordSetup,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
