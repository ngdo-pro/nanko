import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

// Deliberately independent of src/env.server.ts and src/db/client.ts: tests
// must never be able to point at the dev database by a misconfigured import.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is not set (copy .env.example to .env.local)");
}

export const testPool = new Pool({ connectionString: testDatabaseUrl });
export const testDb = drizzle(testPool, { schema });
