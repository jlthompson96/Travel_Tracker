import type { Config } from 'tailwindcss';

// Design tokens for the "Travel Tracker" identity — see README > Design notes.
// Grounded in the subject's own material: passport stamps, ticket stubs, flag
// icons already present in the live Notion data (Passport Stamp formula,
// 🛂 Passport gallery view).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'ink-navy': '#14232E',
        paper: '#F7F2E7',
        brass: '#B98B3E',
        'stamp-red': '#A6392B',
        'horizon-teal': '#1E6E76',
        slate: '#33362E',
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        perforation:
          'repeating-linear-gradient(to bottom, transparent 0 6px, #14232E22 6px 8px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
