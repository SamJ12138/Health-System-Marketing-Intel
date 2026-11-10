import { defineConfig, devices } from '@playwright/test';

// Two builds are tested end to end:
//  - "fixture": the fictional test fixture (vite --mode fixture, dist-fixture).
//    Deterministic, so the whole flow is always exercised.
//  - "snapshot": the build that ships (dist). The same flow runs against the
//    real snapshot; it is skipped only if no snapshot files exist.
const FIXTURE_PORT = 4173;
const SNAPSHOT_PORT = 4174;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'fixture', use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${FIXTURE_PORT}` } },
    { name: 'snapshot', use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${SNAPSHOT_PORT}` } },
  ],
  webServer: [
    {
      command: `npm run build:fixture && npx vite preview --mode fixture --port ${FIXTURE_PORT} --strictPort`,
      url: `http://localhost:${FIXTURE_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npm run build && npx vite preview --port ${SNAPSHOT_PORT} --strictPort`,
      url: `http://localhost:${SNAPSHOT_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
