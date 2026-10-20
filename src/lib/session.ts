const COOKIE = "umkm_pos_session";

const MAX_AGE_SECONDS = 60 * 60 * 16;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  // The fallback is public in the repo, so anyone could mint an admin cookie with it.
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET wajib diisi di produksi.");
  return "dev-only-change-me-please-32chars!!";
}

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromB64url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function sign(payload: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64url(buf);
}

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "MANAGER" | "CASHIER";
  /** Set after an admin reset; the user has to choose a new password before doing anything else. */
  mustChangePassword?: boolean;
};

export async function encodeSession(user: SessionUser) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ ...user, exp })));
  return `${payload}.${await sign(payload)}`;
}

export async function decodeSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await sign(payload);
  if (!safeEqual(sig, expected)) return null;
  try {
    const json = new TextDecoder().decode(fromB64url(payload));
    const { exp, ...user } = JSON.parse(json) as SessionUser & { exp?: number };
    if (!user?.id || !user.role) return null;
    if (!exp || exp * 1000 < Date.now()) return null;
    return user;
  } catch {
    return null;
  }
}

export { COOKIE, MAX_AGE_SECONDS };
