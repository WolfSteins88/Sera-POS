import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL belum diset. Salin .env.example ke .env.local.");
  }
  return url;
}

const globalForSql = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

// Supabase's transaction pooler (port 6543) does not support prepared statements.
// On Vercel, use the session pooler (port 5432) instead: queries through the
// transaction pooler can stall halfway and leave pages loading forever.
function usesTransactionPooler(url: string) {
  return new URL(url).port === "6543";
}

export function getSql() {
  if (!globalForSql.sql) {
    const url = databaseUrl();
    const pooled = usesTransactionPooler(url);
    globalForSql.sql = postgres(url, {
      // Each serverless instance holds its own pool; keep it small so the
      // database's connection limit is shared across instances.
      max: pooled || process.env.VERCEL ? 3 : 10,
      prepare: !pooled,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return globalForSql.sql;
}

export function getDb() {
  return drizzle(getSql(), { schema });
}
