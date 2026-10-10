import { createContext, useContext, useMemo, useState } from 'react';

// Who is signed in. Phase A only has a development preview of each role so the page shells
// can be reviewed; Phase B1 replaces this with real login through the API.
const SessionContext = createContext(null);

const PREVIEW_KEY = 'sulyap.devPreviewRole';

export const PREVIEW_USERS = {
  guest: null,
  user: {
    fullName: 'Juan Dela Cruz',
    role: 'registered_user',
    verification: 'verified',
    unreadNotifications: 2,
  },
  admin: { fullName: 'Sulyap Administrator', role: 'administrator', unreadNotifications: 1 },
  officer: {
    fullName: 'Local Tourism Officer',
    role: 'tourism_officer',
    jurisdictions: 'all',
    unreadNotifications: 0,
  },
  officerMabalacat: {
    fullName: 'Test Officer (Mabalacat City)',
    role: 'tourism_officer',
    jurisdictions: ['Mabalacat City'],
    unreadNotifications: 0,
  },
};

function readPreview() {
  if (!import.meta.env.DEV) return 'guest';
  try {
    return localStorage.getItem(PREVIEW_KEY) || 'guest';
  } catch {
    return 'guest';
  }
}

export function SessionProvider({ children }) {
  const [previewRole, setPreviewRoleState] = useState(readPreview);

  const value = useMemo(() => {
    function setPreviewRole(role) {
      setPreviewRoleState(role);
      try {
        localStorage.setItem(PREVIEW_KEY, role);
      } catch {
        // Storage can be blocked (private mode); the preview still works for this tab.
      }
    }
    return { user: PREVIEW_USERS[previewRole] || null, previewRole, setPreviewRole };
  }, [previewRole]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
