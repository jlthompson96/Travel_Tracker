import type { Config } from 'tailwindcss';

// Design tokens for the "Travel Tracker" identity — see README > Design notes.
// Grounded in the subject's own material: passport stamps, ticket stubs, flag
// icons already present in the live Notion data (Passport Stamp formula,
// 🛂 Passport gallery view).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 'ink-navy' and 'cream' stay fixed in both themes — together they're
        // the "always dark chrome + its light foreground" pair (header,
        // active tab/pill fills), independent of the light/dark page theme.
        'ink-navy': '#14232E',
        cream: '#F7F2E7',
        brass: '#B98B3E',
        // Everything below is theme-aware: each resolves to a CSS custom
        // property (see index.css :root / :root.dark) so light/dark swap
        // without touching every className — see README > Design notes.
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        // Card/panel surfaces — was hardcoded 'white' before dark mode existed;
        // now a step lighter than 'paper' in light mode (same look as before)
        // and a step lighter than the dark 'paper' in dark mode, so text drawn
        // in 'ink' on top of it always has somewhere to stand out against.
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'stamp-red': 'rgb(var(--color-stamp-red) / <alpha-value>)',
        'horizon-teal': 'rgb(var(--color-horizon-teal) / <alpha-value>)',
        slate: 'rgb(var(--color-slate) / <alpha-value>)',
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
