import { sql } from "drizzle-orm";
import { beforeEach } from "vitest";
import { testDb } from "./client";

// Truncate instead of transaction-per-test: simpler to reason about with
// Drizzle's pool-based client, and the test DB exists solely for this.
beforeEach(async () => {
  await testDb.execute(
    sql`TRUNCATE TABLE element_version, element, milestone, project RESTART IDENTITY CASCADE`,
  );
});

// Deliberately no afterAll(testPool.end()) here: setupFiles re-run before
// every test file, so that would close the shared testPool after the first
// file's tests finish and break every file after it. The pool's socket is
// released when the test worker process exits.
