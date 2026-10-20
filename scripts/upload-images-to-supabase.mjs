// Creates the public image bucket (if missing) and copies every image in storage/uploads into it.
// Run once when switching IMAGE_DRIVER to supabase: node scripts/upload-images-to-supabase.mjs
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
for (const name of [".env.local", ".env"]) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (!process.env[key]) process.env[key] = raw.replace(/^["']|["']$/g, "");
  }
}

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_IMAGE_BUCKET || "pos-images";
if (!url || !key) {
  console.error("Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local");
  process.exit(1);
}
const auth = { Authorization: `Bearer ${key}`, apikey: key };
const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

const made = await fetch(`${url}/storage/v1/bucket`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({ id: bucket, name: bucket, public: true, file_size_limit: 2 * 1024 * 1024 }),
});
if (made.ok) console.log(`Bucket ${bucket} dibuat.`);
else if (made.status !== 400 && made.status !== 409) {
  console.error(`Gagal membuat bucket (${made.status}): ${await made.text()}`);
  process.exit(1);
}

const base = path.join(root, "storage", "uploads");
let count = 0;
for (const kind of ["products", "categories", "inventory", "users", "logo"]) {
  const dir = path.join(base, kind);
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    const mime = MIME[file.split(".").pop()?.toLowerCase() ?? ""];
    if (!mime) continue;
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${kind}/${file}`, {
      method: "POST",
      headers: { ...auth, "Content-Type": mime, "x-upsert": "true" },
      body: fs.readFileSync(path.join(dir, file)),
    });
    if (!res.ok) console.error(`Gagal: ${kind}/${file} (${res.status})`);
    else count++;
  }
}
console.log(`${count} gambar diunggah ke ${bucket}.`);
