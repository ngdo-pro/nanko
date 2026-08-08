import { sql } from "drizzle-orm";
import { afterAll, beforeEach } from "vitest";
import { testDb, testPool } from "./client";

// Truncate instead of transaction-per-test: simpler to reason about with
// Drizzle's pool-based client, and the test DB exists solely for this.
beforeEach(async () => {
  await testDb.execute(
    sql`TRUNCATE TABLE element_version, element, milestone, project RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  await testPool.end();
});
