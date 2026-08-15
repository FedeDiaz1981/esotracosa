import { postgresPool } from "@/infrastructure/db/postgres";
import { siteContentSchemaSql } from "@/infrastructure/site-content/schema";

let schemaBootstrapPromise: Promise<void> | null = null;

export async function ensureSiteContentSchema() {
  if (!postgresPool) {
    return;
  }

  if (!schemaBootstrapPromise) {
    schemaBootstrapPromise = postgresPool.query(siteContentSchemaSql).then(() => undefined);
  }

  try {
    await schemaBootstrapPromise;
  } catch (error) {
    schemaBootstrapPromise = null;
    throw error;
  }
}
