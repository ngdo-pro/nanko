import "./load-local-env";

import { runMigrations } from "./run-migrations";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  console.log(`Applying migrations to ${databaseUrl.replace(/:[^:@]*@/, ":***@")}`);
  await runMigrations(databaseUrl);
  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
