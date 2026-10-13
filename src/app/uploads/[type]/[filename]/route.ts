import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { IMAGE_KINDS, type ImageKind } from "@/lib/images/types";
import { imageDriver, uploadDir } from "@/lib/images/save-local";
import { supabasePublicUrl } from "@/lib/images/supabase-store";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_req: Request, ctx: { params: Promise<{ type: string; filename: string }> }) {
  const { type, filename } = await ctx.params;
  if (!IMAGE_KINDS.includes(type as ImageKind)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const safe = path.basename(filename);
  if (safe !== filename || safe.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const ext = safe.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME[ext];
  if (!mime) return new NextResponse("Not found", { status: 404 });
  const file = path.join(uploadDir(type as ImageKind), safe);
  const fallback = path.join(process.cwd(), "public", "uploads", type, safe);
  if (imageDriver() === "supabase") {
    // Demo photos ship in public/uploads; everything uploaded lives in the bucket.
    const bundled = await readFile(fallback).catch(() => null);
    if (bundled) {
      return new NextResponse(new Uint8Array(bundled), {
        headers: { "Content-Type": mime, "Cache-Control": "public, max-age=604800" },
      });
    }
    const remote = supabasePublicUrl(type, safe);
    if (!remote) return new NextResponse("Not found", { status: 404 });
    return NextResponse.redirect(remote, { status: 302, headers: { "Cache-Control": "public, max-age=3600" } });
  }
  try {
    const buf = await readFile(file).catch(() => readFile(fallback));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=604800",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
