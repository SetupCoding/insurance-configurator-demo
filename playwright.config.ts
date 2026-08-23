import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

/** @see https://playwright.dev/docs/test-configuration */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI runs single-worker. Locally Playwright uses about half the cores, and a
  // parallel run on a loaded machine intermittently kills Firefox during
  // context teardown ("_maybeDontRestoreTabs"), which looks like a real
  // cross-browser failure and is not one. Re-run with --workers=1 before
  // believing a local Firefox failure.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    // Tighter than the 0.2 default, and verified stable in the pinned
    // container. Note what this still cannot catch: the comparator works per
    // pixel, so a large-area but low-amplitude change stays invisible however
    // many pixels it touches. A displaced background gradient measured 31/255
    // across a third of the image and no workable threshold flagged it. Such
    // differences have to be prevented at capture time instead, which is what
    // scrollToTop in the visual spec does.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, threshold: 0.1 },
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'pnpm run build && pnpm run start',
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
