import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the M6 e2e smoke suite.
 *
 * Locally, run `pnpm seed:e2e` once before `pnpm e2e` (the seed script
 * needs DATABASE_URL and runs migrations + a deterministic data set).
 * In CI the workflow handles seeding before invoking Playwright.
 *
 * The `webServer` block boots a production `next start` against the
 * already-seeded DB; we never run a dev server in CI to keep the test
 * surface identical to production rendering.
 */
const PORT = Number(process.env["E2E_PORT"] ?? 3100);
const BASE_URL = process.env["E2E_BASE_URL"] ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: process.env["CI"] ? 1 : 0,
  workers: 1,
  reporter: process.env["CI"]
    ? [["github"], ["html", { open: "never" }], ["list"]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    actionTimeout: 8_000,
    navigationTimeout: 12_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(process.env["E2E_NO_WEBSERVER"]
    ? {}
    : {
        webServer: {
          command: `pnpm start -p ${PORT}`,
          url: BASE_URL,
          reuseExistingServer: !process.env["CI"],
          timeout: 60_000,
          stdout: "pipe" as const,
          stderr: "pipe" as const,
        },
      }),
});
