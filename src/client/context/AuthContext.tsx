import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '../types';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

interface AuthResult {
  success: boolean;
  message?: string;
}

interface AuthContextValue {
  ready: boolean;
  user: AuthUser | null;
  status: AuthStatus;
  login: (params: { username: string; password: string; remember?: boolean }) => Promise<AuthResult>;
  register: (params: { username: string; password: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const TOKEN_STORAGE_KEY = 'eaudit_auth_token';
let memoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      memoryToken = stored;
      return stored;
    }
  } catch {
    // Ignore storage restriction inside strict iframes
  }
  return null;
}

export function setAuthToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage restriction inside strict iframes
  }
}

export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await authFetch('/api/auth/user');
      if (!response.ok) {
        setAuthToken(null);
        setUser(null);
        setStatus('unauthenticated');
      } else {
        const data = (await response.json()) as { success: boolean; user?: AuthUser };
        if (data.success && data.user) {
          setUser(data.user);
          setStatus('authenticated');
        } else {
          setAuthToken(null);
          setUser(null);
          setStatus('unauthenticated');
        }
      }
    } catch {
      setUser(null);
      setStatus('unauthenticated');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (params: { username: string; password: string; remember?: boolean }): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = (await response.json()) as { success: boolean; message?: string; token?: string; user?: AuthUser };
      if (!response.ok || !data.success || !data.user) {
        return { success: false, message: data.message || 'Identifiants invalides' };
      }
      if (data.token) {
        setAuthToken(data.token);
      }
      setUser(data.user);
      setStatus('authenticated');
      setReady(true);
      return { success: true };
    } catch {
      return { success: false, message: 'Erreur réseau lors de la connexion' };
    }
  }, []);

  const register = useCallback(async (params: { username: string; password: string }): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = (await response.json()) as { success: boolean; message?: string; token?: string; user?: AuthUser };
      if (!response.ok || !data.success || !data.user) {
        return { success: false, message: data.message || "Erreur lors de l'inscription" };
      }
      if (data.token) {
        setAuthToken(data.token);
      }
      setUser(data.user);
      setStatus('authenticated');
      setReady(true);
      return { success: true };
    } catch {
      return { success: false, message: "Erreur réseau lors de l'inscription" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      status,
      login,
      register,
      logout,
      refresh,
    }),
    [ready, user, status, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
