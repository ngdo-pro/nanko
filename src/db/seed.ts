// Run via `pnpm db:seed` (loads .env.local through --env-file).
// Deliberately does not import ./client: that module pulls in the
// `server-only` guard, which throws unconditionally outside a Next.js
// webpack build (see migrate.ts for the same pattern).
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { element, elementVersion, milestone, project } from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function main() {
  const [demoProject] = await db
    .insert(project)
    .values({ name: "Nanko Demo", slug: "nanko-demo" })
    .onConflictDoNothing({ target: project.slug })
    .returning();

  if (!demoProject) {
    console.log("Seed project already exists (slug 'nanko-demo'), skipping.");
    return;
  }

  const [m1] = await db
    .insert(milestone)
    .values({ projectId: demoProject.id, label: "2026-Q1 — Lancement", sortOrder: 1 })
    .returning();
  const [m2] = await db
    .insert(milestone)
    .values({ projectId: demoProject.id, label: "2026-Q2 — Ajout paiement", sortOrder: 2 })
    .returning();
  if (!m1 || !m2) throw new Error("failed to insert milestones");

  const [booking] = await db
    .insert(element)
    .values({ projectId: demoProject.id, createdAtMilestoneId: m1.id, kind: "system" })
    .returning();
  if (!booking) throw new Error("failed to insert element");

  await db.insert(elementVersion).values({
    elementId: booking.id,
    milestoneId: m1.id,
    name: "Booking",
    description: "Gère les réservations",
  });

  const [payment] = await db
    .insert(element)
    .values({
      projectId: demoProject.id,
      parentId: booking.id,
      createdAtMilestoneId: m2.id,
      kind: "container",
    })
    .returning();
  if (!payment) throw new Error("failed to insert element");

  await db.insert(elementVersion).values({
    elementId: payment.id,
    milestoneId: m2.id,
    name: "PaymentService",
    technology: "TypeScript",
  });

  console.log(`Seeded project "${demoProject.name}" (${demoProject.slug}).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
