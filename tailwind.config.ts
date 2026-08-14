import type { Config } from 'tailwindcss';

// Design tokens for the "Travel Tracker" identity — see README > Design notes.
// Grounded in the subject's own material: passport stamps, ticket stubs, flag
// icons already present in the live Notion data (Passport Stamp formula,
// 🛂 Passport gallery view).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    // A full replacement, NOT theme.extend.screens — Tailwind emits min-width
    // variants in declaration order, so an appended 'xs' would land after '2xl'
    // in the stylesheet and beat sm:/lg: at every width. 'xs' must come first.
    //
    // 400px splits the real iPhone cluster: SE/12-mini/13-mini (375) fall below
    // it, 14/15 Pro/Pro Max (390/393/430) above. md/xl/2xl are unused today but
    // kept so the defaults aren't silently dropped.
    screens: {
      xs: '400px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
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
        // Brass at a weight that passes AA as small text (see index.css).
        'brass-text': 'rgb(var(--color-brass-text) / <alpha-value>)',
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
      // Mobile chrome metrics. env() resolves to 0px everywhere that isn't a
      // notched device (and in print), so these are inert on desktop.
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-l': 'env(safe-area-inset-left)',
        'safe-r': 'env(safe-area-inset-right)',
        tabbar: 'var(--tabbar-total)',
      },
      // Apple's 44pt minimum hit target.
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
      // Leaflet's panes and controls occupy 200–1000 (leaflet.css), so mobile
      // chrome has to clear 1000 or it renders *under* the map's zoom buttons.
      zIndex: { nav: '1100', modal: '2000', lightbox: '2100' },
    },
  },
  plugins: [],
} satisfies Config;
