import { execFileSync } from "node:child_process";

// The e2e suite runs against the real dev database (no isolated test DB for e2e —
// see AGENTS.md / Makefile). Tests use a unique `e2e-*` slug per run, so this only
// ever removes rows this suite created, never real dev data.
//
// Deleted in dependency order rather than relying on cascade: element_version/
// relation_version reference milestone (not just element/relation) without
// ON DELETE CASCADE, so a plain `DELETE FROM project` fails once a test creates
// a milestone with any element or relation version on it.
const CLEANUP_SQL = `
  DELETE FROM annotation WHERE project_id IN (SELECT id FROM project WHERE slug LIKE 'e2e-%');
  DELETE FROM relation_version WHERE relation_id IN (SELECT id FROM relation WHERE project_id IN (SELECT id FROM project WHERE slug LIKE 'e2e-%'));
  DELETE FROM relation WHERE project_id IN (SELECT id FROM project WHERE slug LIKE 'e2e-%');
  DELETE FROM position WHERE element_id IN (SELECT id FROM element WHERE project_id IN (SELECT id FROM project WHERE slug LIKE 'e2e-%'));
  DELETE FROM element_version WHERE element_id IN (SELECT id FROM element WHERE project_id IN (SELECT id FROM project WHERE slug LIKE 'e2e-%'));
  DELETE FROM element WHERE project_id IN (SELECT id FROM project WHERE slug LIKE 'e2e-%');
  DELETE FROM milestone WHERE project_id IN (SELECT id FROM project WHERE slug LIKE 'e2e-%');
  DELETE FROM project WHERE slug LIKE 'e2e-%';
`;

export default function globalTeardown(): void {
  try {
    execFileSync("psql", ["-h", "127.0.0.1", "-U", "nanko", "-d", "nanko", "-c", CLEANUP_SQL], {
      env: { ...process.env, PGPASSWORD: "nanko" },
      stdio: "pipe",
    });
  } catch (error) {
    console.warn("e2e global teardown: failed to clean up e2e-* projects from the dev database.", error);
  }
}
