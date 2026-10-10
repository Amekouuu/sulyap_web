// Small helpers for the development component gallery.
export function Section({ id, title, note, children }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 border-t border-sage py-12 first:border-t-0"
    >
      <h2 id={`${id}-title`} className="text-[28px] font-extrabold tracking-[-0.02em] text-forest">
        {title}
      </h2>
      {note && <p className="mt-1 max-w-2xl text-[15px] text-muted">{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 py-3 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
      <p className="font-mono text-[12px] uppercase tracking-wide text-muted">{label}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
