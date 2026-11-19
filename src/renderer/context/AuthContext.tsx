import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { withCsrfToken } from '@/webserver/middleware/csrfClient';
import { ConfigStorage } from '@/common/storage';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

export interface AuthUser {
  id: string;
  username: string;
  role?: string; // 'admin' or 'user'
}

interface LoginParams {
  username: string;
  password: string;
  remember?: boolean;
}

type LoginErrorCode = 'invalidCredentials' | 'tooManyAttempts' | 'serverError' | 'networkError' | 'unknown';

interface LoginResult {
  success: boolean;
  message?: string;
  code?: LoginErrorCode;
}

interface AuthContextValue {
  ready: boolean;
  user: AuthUser | null;
  status: AuthStatus;
  login: (params: LoginParams) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_USER_ENDPOINT = '/api/auth/user';

const isDesktopRuntime = typeof window !== 'undefined' && Boolean(window.electronAPI);

async function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser | null> {
  try {
    const response = await fetch(AUTH_USER_ENDPOINT, {
      method: 'GET',
      credentials: 'include',
      signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { success: boolean; user?: AuthUser };
    if (data.success && data.user) {
      return { ...data.user, role: data.user.role || 'user' };
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    console.error('Failed to fetch current user:', error);
  }

  return null;
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [ready, setReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    // Check if login is enabled (both Desktop and WebUI modes)
    // Use synchronous localStorage read to avoid race condition with router
    const config = localStorage.getItem('app_config');
    const loginEnabled = config ? JSON.parse(config)?.['security.loginEnabled'] : true; // DEFAULT: TRUE (login enabled)

    if (loginEnabled === false) {
      // Login explicitly disabled: auto-authenticate for both modes
      console.log('[AuthContext] Login disabled, auto-authenticating');
      setUser({ id: 'desktop-user', username: 'local', role: 'admin' });
      setStatus('authenticated');
      setReady(true);
      return;
    }

    if (isDesktopRuntime) {
      // Desktop mode with login enabled: check existing session
      console.log('[AuthContext] Desktop mode - login enabled, checking session');
      const loggedIn = localStorage.getItem('eaudit_logged_in') === 'true';
      const loginTime = localStorage.getItem('eaudit_login_time');

      if (loggedIn && loginTime) {
        // Check if session is still valid (24 hours)
        const now = Date.now();
        const elapsed = now - parseInt(loginTime, 10);
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (elapsed < twentyFourHours) {
          // Valid session exists
          const username = localStorage.getItem('eaudit_username') || 'desktop-user';
          const userId = localStorage.getItem('eaudit_user_id') || 'desktop-user';

          // ISOLATION FIX: Expose userId globally for IPC calls
          (window as any).__currentUserId = userId;

          console.log('[AuthContext] Desktop mode - valid session found for user:', userId);
          setUser({ id: userId, username, role: 'admin' });
          setStatus('authenticated');
          setReady(true);
          return;
        } else {
          // Session expired - clear it
          console.log('[AuthContext] Desktop mode - session expired');
          localStorage.removeItem('eaudit_logged_in');
          localStorage.removeItem('eaudit_login_time');
          localStorage.removeItem('eaudit_username');
        }
      }

      // No valid session - require login
      console.log('[AuthContext] Desktop mode - requiring login');
      setStatus('unauthenticated');
      setUser(null);
      setReady(true);
      return;
    }

    // WebUI mode with login enabled: fetch user from server
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('checking');

    const currentUser = await fetchCurrentUser(controller.signal);
    if (currentUser) {
      setUser(currentUser);
      setStatus('authenticated');
    } else {
      setUser(null);
      setStatus('unauthenticated');
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      abortRef.current?.abort();
    };
  }, [refresh]);

  const login = useCallback(async ({ username, password, remember }: LoginParams): Promise<LoginResult> => {
    try {
      if (isDesktopRuntime) {
        // Simple validation for desktop mode
        if (!username || !password) {
          return {
            success: false,
            message: 'Veuillez remplir tous les champs',
            code: 'invalidCredentials',
          };
        }

        // Multi-user credentials map: { [username]: { password, userId } }
        // This allows multiple users to maintain stable userId across sessions.
        const CREDENTIALS_MAP_KEY = 'eaudit_credentials_map';
        let credentialsMap: Record<string, { password: string; userId: string }> = {};

        try {
          const raw = localStorage.getItem(CREDENTIALS_MAP_KEY);
          if (raw) {
            credentialsMap = JSON.parse(raw) as Record<string, { password: string; userId: string }>;
          }
        } catch {
          // Corrupt map - reset it
          credentialsMap = {};
        }

        let userId: string;
        const existingEntry = credentialsMap[username];

        if (existingEntry && existingEntry.password === password) {
          // Known user reconnecting - reuse stable userId
          userId = existingEntry.userId;
          console.log('[AuthContext] Known user reconnecting, reusing userId:', userId);
        } else {
          // New user or password changed - create a stable userId
          userId = existingEntry?.userId || `user_${Date.now()}`;
          credentialsMap[username] = { password, userId };
          try {
            localStorage.setItem(CREDENTIALS_MAP_KEY, JSON.stringify(credentialsMap));
          } catch {
            console.error('[AuthContext] Failed to save credentials map');
          }
          console.log('[AuthContext] Account registered/updated with userId:', userId);
        }

        // Store login state with username and userId
        localStorage.setItem('eaudit_logged_in', 'true');
        localStorage.setItem('eaudit_login_time', Date.now().toString());
        localStorage.setItem('eaudit_username', username);
        localStorage.setItem('eaudit_user_id', userId);

        // ISOLATION FIX: Expose userId globally for IPC calls
        (window as any).__currentUserId = userId;

        console.log('[AuthContext] Desktop login successful for user:', userId);
        setUser({ id: userId, username, role: 'admin' });
        setStatus('authenticated');
        setReady(true);
        return { success: true };
      }

      // P1 安全修复：登录请求需要 CSRF Token / P1 Security fix: Login needs CSRF token
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(withCsrfToken({ username, password, remember })),
      });

      const data = (await response.json()) as {
        success: boolean;
        message?: string;
        user?: AuthUser;
      };

      if (!response.ok || !data.success || !data.user) {
        let code: LoginErrorCode = 'unknown';
        if (response.status === 401) {
          code = 'invalidCredentials';
        } else if (response.status === 429) {
          code = 'tooManyAttempts';
        } else if (response.status >= 500) {
          code = 'serverError';
        }

        return {
          success: false,
          message: data?.message ?? 'Login failed',
          code,
        };
      }

      setUser(data.user);
      setStatus('authenticated');
      setReady(true);

      // Re-enable WebSocket reconnection after successful login (WebUI mode only)
      if (typeof window !== 'undefined' && (window as any).__websocketReconnect) {
        (window as any).__websocketReconnect();
      }

      return { success: true };
    } catch (error) {
      console.error('Login request failed:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
        code: 'networkError',
      };
    }
  }, []);

  const logout = useCallback(async () => {
    if (isDesktopRuntime) {
      // ISOLATION FIX: Clear global userId
      delete (window as any).__currentUserId;

      localStorage.removeItem('eaudit_logged_in');
      localStorage.removeItem('eaudit_login_time');
      localStorage.removeItem('eaudit_username');
      localStorage.removeItem('eaudit_user_id');
      // Note: on ne supprime PAS eaudit_credentials_map pour permettre la reconnexion de tous les users
      // On supprime l'ancien format mono-user s'il existe encore
      localStorage.removeItem('eaudit_credentials');
      setUser(null);
      setStatus('unauthenticated');
      setReady(true);
      return;
    }

    try {
      await fetch('/logout', {
        method: 'POST',
        // Logout also needs CSRF token / 登出同样需要 CSRF Token
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(withCsrfToken({})),
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
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
      logout,
      refresh,
    }),
    [login, logout, ready, refresh, status, user]
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
