/**
 * Supabase Storage driver for uploaded images. The database stays on PostgreSQL;
 * only image files live in the bucket, so they survive redeploys and serverless hosts.
 *
 * Env (server only):
 *   IMAGE_DRIVER=supabase
 *   SUPABASE_URL=https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<service role key>
 *   SUPABASE_IMAGE_BUCKET=pos-images   (optional, must be a public bucket)
 */
export const SUPABASE_IMAGE_BUCKET = process.env.SUPABASE_IMAGE_BUCKET || "pos-images";

export function supabaseObjectPath(kind: string, key: string) {
  return `${kind}/${key}`;
}

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi untuk penyimpanan gambar.");
  return { url, key };
}

function headers(key: string, extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${key}`, apikey: key, ...extra };
}

export function supabasePublicUrl(kind: string, key: string) {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  if (!url) return null;
  return `${url}/storage/v1/object/public/${SUPABASE_IMAGE_BUCKET}/${supabaseObjectPath(kind, key)}`;
}

export async function uploadObject(kind: string, key: string, body: Uint8Array, contentType: string) {
  const { url, key: token } = config();
  const res = await fetch(`${url}/storage/v1/object/${SUPABASE_IMAGE_BUCKET}/${supabaseObjectPath(kind, key)}`, {
    method: "POST",
    headers: headers(token, { "Content-Type": contentType, "x-upsert": "true", "Cache-Control": "max-age=604800" }),
    body: Buffer.from(body),
  });
  if (!res.ok) throw new Error(`Gagal mengunggah gambar (${res.status}).`);
}

export async function removeObject(kind: string, key: string) {
  const { url, key: token } = config();
  await fetch(`${url}/storage/v1/object/${SUPABASE_IMAGE_BUCKET}`, {
    method: "DELETE",
    headers: headers(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: [supabaseObjectPath(kind, key)] }),
  }).catch(() => {});
}

export async function copyObject(kind: string, from: string, to: string) {
  const { url, key: token } = config();
  const res = await fetch(`${url}/storage/v1/object/copy`, {
    method: "POST",
    headers: headers(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      bucketId: SUPABASE_IMAGE_BUCKET,
      sourceKey: supabaseObjectPath(kind, from),
      destinationKey: supabaseObjectPath(kind, to),
    }),
  });
  return res.ok;
}
