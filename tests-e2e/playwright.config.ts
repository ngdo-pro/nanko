import { defineConfig, devices } from "@playwright/test";

const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://app.preprod.nanko.dev";
const LIBRARY_BASE_URL = process.env.LIBRARY_BASE_URL ?? "https://library.preprod.nanko.dev";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: APP_BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "app",
      testMatch: /app\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: APP_BASE_URL },
    },
    {
      name: "library",
      testMatch: /library\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: LIBRARY_BASE_URL },
    },
  ],
});
