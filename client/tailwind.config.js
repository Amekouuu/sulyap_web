// Design tokens taken from the Sulyap mockup (brand kit colors, radii, shadow, type scale).
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#234638', 600: '#2E5A48', 50: '#EBF1ED' },
        minty: { DEFAULT: '#76D6A6', 100: '#DDF5E9', 50: '#EEFAF4' },
        gold: { DEFAULT: '#E3AA45', 100: '#FBEFD9', 700: '#8F6212' },
        terracotta: { DEFAULT: '#C9653B', 700: '#9A4524', 50: '#F7E9E2' },
        pin: { DEFAULT: '#CC0000', hi: '#FF0000', 700: '#A80000', 50: '#FCEBEB' },
        cream: '#F7F4EE',
        surface: '#FFFFFF',
        charcoal: '#252927',
        // Slightly darker than the mockup (#66736C) so small text passes 4.5:1 contrast on cream.
        muted: '#5C6862',
        sage: '#D9E0DB',
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        mega: ['68px', { lineHeight: '1.0', letterSpacing: '-0.035em', fontWeight: '800' }],
        figure: ['44px', { lineHeight: '1.0', letterSpacing: '-0.03em', fontWeight: '800' }],
      },
      borderRadius: {
        panel: '16px',
        ctl: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(35,70,56,.05), 0 6px 18px -10px rgba(35,70,56,.18)',
        pop: '0 20px 50px -20px rgba(35,70,56,.35)',
      },
      maxWidth: {
        page: '1360px',
      },
    },
  },
  plugins: [],
};
