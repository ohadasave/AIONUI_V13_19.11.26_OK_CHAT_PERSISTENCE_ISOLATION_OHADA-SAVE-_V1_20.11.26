import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { withCsrfToken } from '@/webserver/middleware/csrfClient';
import { ConfigStorage } from '@/common/storage';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

export interface AuthUser {
  id: string;
  username: string;
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
      return data.user;
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
    const loginEnabled = await ConfigStorage.get('security.loginEnabled');

    if (loginEnabled === false || loginEnabled === undefined) {
      // Login disabled: auto-authenticate for both modes
      console.log('[AuthContext] Login disabled, auto-authenticating');
      setUser({ id: 'desktop-user', username: 'local' });
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
          console.log('[AuthContext] Desktop mode - valid session found');
          setUser({ id: 'desktop-user', username });
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

        // Check if credentials already exist (reconnection)
        const storedCredentials = localStorage.getItem('eaudit_credentials');

        if (storedCredentials) {
          // Reconnection: validate credentials
          try {
            const { username: storedUsername, password: storedPassword } = JSON.parse(storedCredentials);

            if (username !== storedUsername || password !== storedPassword) {
              return {
                success: false,
                message: 'Identifiants incorrects',
                code: 'invalidCredentials',
              };
            }
          } catch (error) {
            console.error('[AuthContext] Failed to parse stored credentials:', error);
            // Clear invalid credentials
            localStorage.removeItem('eaudit_credentials');
          }
        } else {
          // First login: store credentials
          localStorage.setItem('eaudit_credentials', JSON.stringify({ username, password }));
        }

        // Store login state with username
        localStorage.setItem('eaudit_logged_in', 'true');
        localStorage.setItem('eaudit_login_time', Date.now().toString());
        localStorage.setItem('eaudit_username', username);

        setUser({ id: 'desktop-user', username });
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
      localStorage.removeItem('eaudit_logged_in');
      localStorage.removeItem('eaudit_login_time');
      localStorage.removeItem('eaudit_username');
      // Note: on ne supprime PAS eaudit_credentials pour permettre la reconnexion
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
