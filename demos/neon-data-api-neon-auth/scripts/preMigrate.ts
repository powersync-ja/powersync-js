import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[preMigrate] DATABASE_URL is not set");
    process.exit(1);
  }

  // Use Neon's serverless HTTP client for consistency with the project
  const http = neon(url);
  const db = drizzle(http);

  await db.execute(sql`
    GRANT SELECT, UPDATE, INSERT, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  `);

  await db.execute(sql`
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anonymous;
  `);

  console.log("[preMigrate] Successfully executed GRANT statements");
}

main().catch((err) => {
  console.error("[preMigrate] Error executing pre-migration grants:", err);
  process.exit(1);
});
