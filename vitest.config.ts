import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import path from "node:path";

config({ path: ".env.local" });

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    globalSetup: ["./src/db/test/global-setup.ts"],
    setupFiles: ["./src/db/test/setup.ts"],
    fileParallelism: false, // all tests share one Postgres DB; truncate-between-tests isn't safe under parallel files
  },
});
