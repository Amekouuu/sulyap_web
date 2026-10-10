import { LogoMark } from '@/components/Logo';

// Footer bar for the admin console and the officer portal.
export function SlimFooter({ area, note }) {
  return (
    <footer className="border-t border-sage bg-surface">
      <div className="flex flex-col gap-2 px-6 py-5 text-[13px] text-muted md:flex-row md:items-center md:justify-between lg:px-10">
        <p className="inline-flex items-center gap-2">
          <LogoMark className="h-6 w-6" />
          <span className="font-bold text-forest">Sulyap</span>
          <span>{area}</span>
        </p>
        <p>{note}</p>
        <p>&copy; 2026 Sulyap &middot; Holy Angel University, School of Computing</p>
      </div>
    </footer>
  );
}
