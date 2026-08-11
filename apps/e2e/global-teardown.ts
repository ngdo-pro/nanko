import { execFileSync } from "node:child_process";

// The e2e suite runs against the real dev database (no isolated test DB for e2e —
// see AGENTS.md / Makefile). Tests use a unique `e2e-*` slug per run, so this only
// ever removes rows this suite created, never real dev data.
export default function globalTeardown(): void {
  try {
    execFileSync(
      "psql",
      ["-h", "127.0.0.1", "-U", "nanko", "-d", "nanko", "-c", "DELETE FROM project WHERE slug LIKE 'e2e-%';"],
      { env: { ...process.env, PGPASSWORD: "nanko" }, stdio: "pipe" },
    );
  } catch (error) {
    console.warn("e2e global teardown: failed to clean up e2e-* projects from the dev database.", error);
  }
}
