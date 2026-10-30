import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

// Who is signed in, read from the server (GET /api/auth/me). The session itself is an
// httpOnly cookie the page cannot read; this context only holds the public user details.
const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api('/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, login, logout, setUser }),
    [user, loading, refresh, login, logout],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}

// Where each role lands after logging in.
export function homePathFor(user) {
  if (!user) return '/';
  if (user.role === 'administrator') return '/admin';
  if (user.role === 'tourism_officer') return '/officer';
  if (user.verification === 'email_unverified') return '/check-email';
  if (user.verification === 'no_id') return '/upload-id';
  return '/';
}

// Only same-site paths are allowed as ?next= targets, so links cannot send people elsewhere.
export function safeNextPath(next) {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : null;
}
