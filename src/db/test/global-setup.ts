import { runMigrations } from "../run-migrations";

// Runs once for the whole test run, before any test file. Keeps the test DB
// schema in sync with drizzle/*.sql so `pnpm test` never fails on a stale
// schema someone forgot to migrate locally.
export default async function globalSetup() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is not set (copy .env.example to .env.local)");
  }

  await runMigrations(testDatabaseUrl);
}
