import { defineConfig } from 'playwright/test';
import path from 'node:path';

// The e2e server is started by tests/e2e/fixtures.ts (in-memory database, fixed secret), so no webServer block is needed.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] },
    trace: 'off',
  },
  outputDir: path.join('.cache', 'test-results'),
});
