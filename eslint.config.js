import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `out/` is gitignored build output, and one of the things that lands in it
  // is `out/renders/.bundle/bundle.js` — Remotion's bundle, 35k lines of
  // vendored code carrying eslint-disable comments for rules this config does
  // not define. Linting it produced a hundred "rule not found" errors the
  // first time anyone rendered from the studio.
  globalIgnores(['dist', 'out']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Underscore marks a parameter as deliberately unused — the repo's
      // convention for signature-shaped callbacks (map's (_c, _i), curve
      // samplers' (_t), axis helpers' (_x, _z)).
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  {
    // Legacy scene tree: authored before eslint-plugin-react-hooks v7's
    // React-Compiler rules landed. Scenes deliberately mutate three.js
    // objects during render and build seeded-random layouts inline — safe
    // here (no React Compiler in this build) but flagged by the new rules.
    // New code (src/studio, src/remotion, hooks, utils) stays fully strict;
    // migrate legacy files opportunistically when touching them.
    files: [
      'src/scenes/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      // Agent-generated scene trees — same character as the legacy scenes.
      'src/scenes_gemini/**/*.{ts,tsx}',
      'src/scenes_fable/**/*.{ts,tsx}',
    ],
    rules: {
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/unsupported-syntax': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
])
