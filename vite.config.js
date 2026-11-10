import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const fromRoot = (path) => fileURLToPath(new URL(path, import.meta.url))

// "#dataset" is the data the app shows. Normally it is the verified snapshot
// in src/data. In fixture mode (vite --mode fixture) it is the fictional
// fixture in tests/fixtures, built into dist-fixture so it can never be
// mistaken for, or deployed as, the real build.
export default defineConfig(({ mode }) => {
  const fixture = mode === 'fixture'
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '#dataset': fromRoot(fixture ? './tests/fixtures/dataset.js' : './src/data/dataset.js'),
      },
    },
    build: { outDir: fixture ? 'dist-fixture' : 'dist' },
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.js'],
      include: ['tests/unit/**/*.test.{js,jsx}'],
      css: false,
      // The App tests wait for the real landing animation; the default 5 s is too tight on a slow CI runner.
      testTimeout: 15000,
    },
  }
})
