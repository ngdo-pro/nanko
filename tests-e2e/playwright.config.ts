import { defineConfig, devices } from "@playwright/test";
import { env } from "./config/env";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: env.isCi,
  retries: env.isCi ? 2 : 0,
  reporter: "html",
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: env.appBaseUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "app",
      testMatch: /app\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: env.appBaseUrl },
    },
    {
      name: "library",
      testMatch: /library\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: env.libraryBaseUrl },
    },
  ],
});
