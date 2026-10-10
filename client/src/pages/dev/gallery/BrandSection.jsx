import { Logo, LogoMark } from '@/components/Logo';
import { Row, Section } from './Section';

const COLORS = [
  { name: 'forest', hex: '#234638', use: 'Primary' },
  { name: 'forest-600', hex: '#2E5A48', use: 'Primary hover' },
  { name: 'minty', hex: '#76D6A6', use: 'Accent' },
  { name: 'gold', hex: '#E3AA45', use: 'Accent, pending' },
  { name: 'terracotta', hex: '#C9653B', use: 'Returned, attention' },
  { name: 'pin', hex: '#CC0000', use: 'Map pin, errors' },
  { name: 'cream', hex: '#F7F4EE', use: 'Page background' },
  { name: 'surface', hex: '#FFFFFF', use: 'Cards' },
  { name: 'charcoal', hex: '#252927', use: 'Text' },
  { name: 'muted', hex: '#5C6862', use: 'Secondary text' },
  { name: 'sage', hex: '#D9E0DB', use: 'Borders' },
];

export function BrandSection() {
  return (
    <Section
      id="brand"
      title="Brand"
      note="Logo redrawn as SVG from the mockup. Hanken Grotesk for text, IBM Plex Mono for codes."
    >
      <Row label="Logo">
        <Logo />
        <span className="rounded-panel bg-forest px-5 py-3">
          <Logo light />
        </span>
        <LogoMark className="h-16 w-16" />
        <LogoMark className="h-6 w-6" />
      </Row>
      <Row label="Colors">
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COLORS.map((c) => (
            <div key={c.name} className="overflow-hidden rounded-ctl border border-sage bg-surface">
              <div className="h-14" style={{ background: c.hex }} />
              <div className="px-3 py-2">
                <p className="text-[13px] font-semibold">{c.name}</p>
                <p className="font-mono text-[11px] text-muted">{c.hex}</p>
                <p className="text-[12px] text-muted">{c.use}</p>
              </div>
            </div>
          ))}
        </div>
      </Row>
      <Row label="Type">
        <div className="space-y-3">
          <p className="text-mega text-forest">Pampanga has more</p>
          <p className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
            Page title
          </p>
          <p className="text-[28px] font-extrabold tracking-[-0.02em] text-forest">
            Section heading
          </p>
          <p className="text-[20px] font-bold text-charcoal">Card heading</p>
          <p className="max-w-xl text-[16px] leading-relaxed">
            Body text. A waterfall with strong cascades and rocky pools, a short hike from the Villa
            Maria resettlement road.
          </p>
          <p className="text-[13px] text-muted">Small print and hints</p>
          <p className="font-mono text-[12px] uppercase tracking-wide text-muted">
            Codes and labels
          </p>
        </div>
      </Row>
    </Section>
  );
}
