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

// Supabase's transaction pooler (port 6543) does not support prepared statements,
// and each Vercel function instance should hold only a few connections.
function usesTransactionPooler(url: string) {
  return new URL(url).port === "6543";
}

export function getSql() {
  if (!globalForSql.sql) {
    const url = databaseUrl();
    const pooled = usesTransactionPooler(url);
    globalForSql.sql = postgres(url, {
      max: pooled ? 3 : 10,
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
