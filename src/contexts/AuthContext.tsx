import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { StoredAuthUser, User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const SEEDED_USERS: Record<string, { password: string; user: User }> = {
  'superadmin@mosyf.org': {
    password: 'admin123',
    user: { email: 'superadmin@mosyf.org', name: 'Super Admin', role: 'super_admin' },
  },
  'admin@mosyf.org': {
    password: 'admin123',
    user: { email: 'admin@mosyf.org', name: 'Admin User', role: 'admin' },
  },
  'executive@mosyf.org': {
    password: 'exec123',
    user: { email: 'executive@mosyf.org', name: 'Michael Emenike', role: 'executive' },
  },
  'member@mosyf.org': {
    password: 'member123',
    user: { email: 'member@mosyf.org', name: 'John Okafor', role: 'member' },
  },
};

export const REGISTERED_USERS_STORAGE_KEY = 'mosyf_registered_users';

export function addRegisteredAuthUser(authUser: StoredAuthUser) {
  try {
    const stored = window.localStorage.getItem(REGISTERED_USERS_STORAGE_KEY);
    const users = stored ? JSON.parse(stored) as StoredAuthUser[] : [];
    const normalizedEmail = authUser.email.trim().toLowerCase();
    const nextUsers = users.filter(item => item.email.trim().toLowerCase() !== normalizedEmail);
    nextUsers.push({
      ...authUser,
      email: normalizedEmail,
      user: { ...authUser.user, email: normalizedEmail },
    });
    window.localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(nextUsers));
  } catch (error) {
    console.warn('Unable to persist registered user credentials.', error);
  }
}

export function updateRegisteredAuthUserRole(email: string, role: UserRole) {
  try {
    const stored = window.localStorage.getItem(REGISTERED_USERS_STORAGE_KEY);
    const users = stored ? JSON.parse(stored) as StoredAuthUser[] : [];
    const normalizedEmail = email.trim().toLowerCase();
    const nextUsers = users.map(item => item.email.trim().toLowerCase() === normalizedEmail ? {
      ...item,
      user: { ...item.user, role },
    } : item);
    window.localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(nextUsers));
  } catch (error) {
    console.warn('Unable to update registered user role.', error);
  }
}

function readRegisteredUsers(): Record<string, { password: string; user: User }> {
  try {
    const stored = window.localStorage.getItem(REGISTERED_USERS_STORAGE_KEY);
    const users = stored ? JSON.parse(stored) as StoredAuthUser[] : [];
    return users.reduce<Record<string, { password: string; user: User }>>((acc, item) => {
      acc[item.email.trim().toLowerCase()] = { password: item.password, user: item.user };
      return acc;
    }, {});
  } catch {
    return {};
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('mosyf_auth');
    if (saved) {
      try {
        const { user: savedUser } = JSON.parse(saved);
        setUser(savedUser);
        setRole(savedUser.role);
      } catch {
        localStorage.removeItem('mosyf_auth');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 800));
    
    const normalizedEmail = email.trim().toLowerCase();
    const found = {
      ...SEEDED_USERS,
      ...readRegisteredUsers(),
    }[normalizedEmail];
    if (found && found.password === password) {
      setUser(found.user);
      setRole(found.user.role);
      localStorage.setItem('mosyf_auth', JSON.stringify({ user: found.user }));
      setIsLoading(false);
      return { success: true, role: found.user.role };
    }
    
    setIsLoading(false);
    return { success: false };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('mosyf_auth');
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
