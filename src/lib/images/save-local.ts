import { copyFile, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { IMAGE_KINDS, IMAGE_MAX_BYTES, IMAGE_MIME, type ImageKind } from "./types";
import { copyObject, removeObject, uploadObject } from "./supabase-store";

function dirFor(kind: ImageKind) {
  return path.join(process.cwd(), "storage", "uploads", kind);
}

/** "supabase" keeps images in Supabase Storage; "local" writes to storage/uploads (lost on serverless redeploys). */
export function imageDriver() {
  const driver = process.env.IMAGE_DRIVER || process.env.NEXT_PUBLIC_IMAGE_DRIVER || "local";
  return driver === "supabase" ? "supabase" : "local";
}

function newKey(ext: string) {
  return `${randomBytes(12).toString("hex")}${ext.startsWith(".") ? ext : `.${ext}`}`;
}

export async function saveUpload(file: File | null, kind: ImageKind, oldName?: string | null) {
  if (!file || file.size === 0) return oldName ?? null;
  if (!IMAGE_KINDS.includes(kind)) throw new Error("Jenis unggahan tidak valid.");
  if (file.size > IMAGE_MAX_BYTES) throw new Error("Gambar maksimal 2MB.");
  const ext = IMAGE_MIME[file.type];
  if (!ext) throw new Error("Gunakan JPG, PNG, atau WEBP.");
  const key = newKey(ext);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (imageDriver() === "supabase") {
    await uploadObject(kind, key, bytes, file.type);
  } else {
    const dir = dirFor(kind);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, key), bytes);
  }
  if (oldName) await removeUpload(kind, oldName);
  return key;
}

export async function removeUpload(kind: ImageKind, filename: string | null | undefined) {
  if (!filename) return;
  const safe = path.basename(filename);
  if (safe !== filename) return;
  if (imageDriver() === "supabase") {
    await removeObject(kind, safe);
    return;
  }
  await unlink(path.join(dirFor(kind), safe)).catch(() => {});
}

/** Duplicates an image under a new name; returns null when the source is missing. */
export async function copyUpload(kind: ImageKind, filename: string | null | undefined) {
  if (!filename) return null;
  const safe = path.basename(filename);
  if (safe !== filename) return null;
  const next = newKey(path.extname(safe));
  if (imageDriver() === "supabase") {
    return (await copyObject(kind, safe, next)) ? next : null;
  }
  const dir = dirFor(kind);
  try {
    await copyFile(path.join(dir, safe), path.join(dir, next));
    return next;
  } catch {
    return null;
  }
}

export function uploadDir(kind: ImageKind) {
  return dirFor(kind);
}
