import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/env.server";
import { logger } from "@/lib/logger";
import * as schema from "./schema";

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, {
  schema,
  // Logs every SQL statement Drizzle issues, with bind params. Dev only —
  // this is what makes "what query just ran" answerable without a debugger.
  logger:
    env.NODE_ENV === "development"
      ? {
          logQuery(query, params) {
            logger.debug({ query, params }, "db.query");
          },
        }
      : false,
});
