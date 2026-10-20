import { after } from "next/server";
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

const onVercel = Boolean(process.env.VERCEL);
const idleTimeoutSeconds = onVercel ? 5 : 20;

// Supabase's session pooler allows only 15 clients in total. Vercel freezes an
// instance once its response is sent, so postgres.js never gets to run its idle
// timer and the instance keeps its connections until it is shut down. A few
// warm instances then use up every slot and pages fail with EMAXCONNSESSION.
// Keeping the function alive a little past the idle timeout lets the pool close
// its idle connections before the instance is frozen.
function releaseIdleConnectionsAfterResponse() {
  if (!onVercel) return;
  try {
    after(() => new Promise((resolve) => setTimeout(resolve, idleTimeoutSeconds * 1000 + 500)));
  } catch {
    // Outside a request (build, scripts) there is nothing to keep alive.
  }
}

export function getSql() {
  if (!globalForSql.sql) {
    const url = databaseUrl();
    const pooled = usesTransactionPooler(url);
    globalForSql.sql = postgres(url, {
      // Each serverless instance holds its own pool; keep it small so the
      // pooler's client limit is shared across instances.
      max: pooled || onVercel ? 2 : 10,
      prepare: !pooled,
      idle_timeout: idleTimeoutSeconds,
      connect_timeout: 10,
    });
  }
  releaseIdleConnectionsAfterResponse();
  return globalForSql.sql;
}

export function getDb() {
  return drizzle(getSql(), { schema });
}
