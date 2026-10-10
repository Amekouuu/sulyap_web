import { useNavigate } from 'react-router-dom';
import { useSession } from '@/session/SessionContext';

const OPTIONS = [
  { role: 'guest', label: 'Guest', home: '/' },
  { role: 'user', label: 'Registered user', home: '/' },
  { role: 'admin', label: 'Administrator', home: '/admin' },
  { role: 'officer', label: 'Officer (all)', home: '/officer' },
  { role: 'officerMabalacat', label: 'Test officer (Mabalacat)', home: '/officer' },
];

// Development only: preview the shells as each role until real login exists (Phase B1).
export function DevRoleSwitcher() {
  const { previewRole, setPreviewRole } = useSession();
  const navigate = useNavigate();
  if (!import.meta.env.DEV) return null;
  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-ctl border border-sage bg-surface/95 px-3 py-2 text-[12px] shadow-pop">
      <label
        htmlFor="dev-role"
        className="font-mono font-medium uppercase tracking-wide text-muted"
      >
        Preview as
      </label>
      <select
        id="dev-role"
        value={previewRole}
        onChange={(event) => {
          const option = OPTIONS.find((o) => o.role === event.target.value);
          setPreviewRole(option.role);
          navigate(option.home);
        }}
        className="rounded-[6px] border border-sage bg-white px-2 py-1 font-semibold text-charcoal"
      >
        {OPTIONS.map((o) => (
          <option key={o.role} value={o.role}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
