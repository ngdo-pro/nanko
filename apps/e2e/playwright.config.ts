import { defineConfig, devices } from "@playwright/test";

// Assumes `make dev` (Postgres, Mercure, Symfony, Vite) is already running.
export default defineConfig({
  testDir: "./tests",
  globalTeardown: "./global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    testIdAttribute: "data-qa",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
