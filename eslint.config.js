import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist-fixture', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{js,jsx,mjs}'],
    plugins: { react },
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Marks identifiers used in JSX (including <motion.div>) as used, so
      // no-unused-vars needs no blanket exemption for capitalised names.
      'react/jsx-uses-vars': 'error',
      'no-unused-vars': 'error',
    },
  },
  {
    files: ['*.config.js', 'scripts/**/*.mjs', 'tests/**/*.{js,jsx,mjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
])
