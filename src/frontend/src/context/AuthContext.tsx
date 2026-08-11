import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AUTH_EXPIRED_EVENT, tokenStore } from '../api/client';
import { login as loginRequest } from '../api/auth';
import type { AppRole, AuthUser } from '../types/auth';

const USER_KEY = 'bom.auth.user';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: AppRole[]) => boolean;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const EDITOR_ROLES: AppRole[] = ['DataSpecialist', 'Admin'];

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    tokenStore.get() ? readStoredUser() : null,
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener(AUTH_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    tokenStore.set(response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setUser(response.user);
  }, []);

  const hasRole = useCallback(
    (...roles: AppRole[]) => !!user && roles.some((role) => user.roles.includes(role)),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      logout,
      hasRole,
      canEdit: !!user && user.roles.some((role) => EDITOR_ROLES.includes(role)),
    }),
    [user, login, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
