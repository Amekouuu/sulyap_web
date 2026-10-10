import { BrandSection } from './gallery/BrandSection';
import { ControlsSection } from './gallery/ControlsSection';
import { StatusSection } from './gallery/StatusSection';
import { FeedbackSection } from './gallery/FeedbackSection';
import { MediaSection } from './gallery/MediaSection';

const SECTIONS = [
  { id: 'brand', label: 'Brand' },
  { id: 'controls', label: 'Controls' },
  { id: 'status', label: 'Status' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'media', label: 'Photos' },
];

// Development only: every shared component in one place, for design review before pages are built.
export function ComponentGallery() {
  return (
    <div className="mx-auto max-w-page px-5 py-12 sm:px-8">
      <p className="font-mono text-[12px] uppercase tracking-wide text-muted">Development only</p>
      <h1 className="mt-1 text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
        Design system
      </h1>
      <p className="mt-2 max-w-2xl text-[16px] text-muted">
        Shared components built from the Sulyap mockup. Use the switcher at the bottom left to
        preview the page shells as each role.
      </p>
      <nav aria-label="Sections" className="mt-6 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-sage bg-surface px-4 py-1.5 text-[14px] font-medium hover:bg-minty-50"
          >
            {s.label}
          </a>
        ))}
      </nav>
      <div className="mt-6">
        <BrandSection />
        <ControlsSection />
        <StatusSection />
        <FeedbackSection />
        <MediaSection />
      </div>
    </div>
  );
}
