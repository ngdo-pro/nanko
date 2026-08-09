import { config } from "dotenv";

// Shared by scripts that run outside Next.js (drizzle-kit, tsx, vitest
// config) and therefore don't get .env.local loaded automatically.
config({ path: ".env.local" });
