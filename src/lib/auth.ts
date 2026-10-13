import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "./schema";
import type { Role } from "./rbac";
import { COOKIE, MAX_AGE_SECONDS, decodeSession, encodeSession, type SessionUser } from "./session";

export type { SessionUser };

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const cookieUser = await decodeSession(jar.get(COOKIE)?.value);
  if (!cookieUser) return null;
  // Re-read the account so a deactivated or demoted user loses access right away.
  const [row] = await getDb()
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
    })
    .from(users)
    .where(eq(users.id, cookieUser.id))
    .limit(1);
  if (!row || !row.isActive) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role as Role,
    mustChangePassword: row.mustChangePassword,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  if (user.mustChangePassword) {
    throw new Error("Buat password baru dulu sebelum melanjutkan.");
  }
  return user;
}

export async function changeOwnPassword(current: SessionUser, password: string) {
  const db = getDb();
  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, current.id)).limit(1);
  if (!row) throw new Error("Pengguna tidak ditemukan.");
  if (await bcrypt.compare(password, row.passwordHash)) {
    throw new Error("Password baru harus berbeda dari password sementara.");
  }
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(password, 12), mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, current.id));
}

export async function login(username: string, password: string): Promise<SessionUser | null> {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!row || !row.isActive) return null;
  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) return null;
  await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, row.id));
  const session: SessionUser = {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role as Role,
    mustChangePassword: row.mustChangePassword,
  };
  const jar = await cookies();
  jar.set(COOKIE, await encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
  });
  return session;
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
