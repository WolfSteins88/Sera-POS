export const IMAGE_KINDS = ["products", "categories", "inventory", "users", "logo"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Always the app's own route; it serves local files or redirects to Supabase Storage. */
export function imageUrl(kind: ImageKind, filename: string | null | undefined) {
  if (!filename) return null;
  return `/uploads/${kind}/${filename}`;
}
