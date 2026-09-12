import { defineConfig, devices } from "@playwright/test";

const externalServers = process.env.PLAYWRIGHT_EXTERNAL_SERVERS === "true";
const hasStagingCredentials = Boolean(process.env.E2E_ADMIN_PASSWORD || process.env.E2E_STUDENT_PASSWORD);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Serial browser execution avoids Firefox/WebKit graphics teardown crashes
  // on small Windows and CI runners while retaining the full engine matrix.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  // axe scans and WebKit/Firefox startup can be slow on shared CI runners.
  timeout: 60_000,
  expect: { timeout: 7_500 },
  use: {
    // Staging traces can contain form values. Never persist them when account
    // credentials are supplied; ordinary local failures retain rich evidence.
    trace: hasStagingCredentials ? "off" : "retain-on-failure",
    screenshot: hasStagingCredentials ? "off" : "only-on-failure",
    video: hasStagingCredentials ? "off" : "retain-on-failure",
  },
  webServer: externalServers
    ? undefined
    : [
        {
          command: "pnpm --filter admin-dashboard exec next dev --port 3300",
          url: "http://127.0.0.1:3300/login",
          env: { ...process.env, NEXT_PUBLIC_ENABLE_FIREBASE: "false" },
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: "pnpm --filter student-website exec next dev --port 3301",
          url: "http://127.0.0.1:3301/login",
          env: { ...process.env, NEXT_PUBLIC_ENABLE_FIREBASE: "false" },
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
});
