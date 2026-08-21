// `npm run lint` was defined in package.json long before this file existed, so
// the script has always failed with "couldn't find a configuration file". This
// is the minimum that makes it real: type-aware-free TS rules plus the two
// React plugins that catch the mistakes this codebase can actually make
// (conditional hooks, non-component exports breaking fast refresh).
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'public', 'node_modules', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Notion's API surface is wide and loosely typed at the edges; the
      // parsers in transformNotionData.ts narrow it deliberately.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Demoted from error. This rule (new in eslint-plugin-react-hooks 7) fires
      // on three deliberate, commented patterns that predate the lint setup:
      // resetting lightbox index when the modal's trip changes, the count-up
      // stat animation's reduced-motion branch, and re-reading a MediaQueryList
      // on subscribe. All three are reset-on-change or external-store syncs, all
      // three are verified on-device. Worth revisiting (useSyncExternalStore is
      // the right shape for useMediaQuery) but not worth churning to silence.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Build scripts and the serverless handler run in Node, not the browser.
    files: ['scripts/**/*.mjs', 'api/**/*.ts', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
);
