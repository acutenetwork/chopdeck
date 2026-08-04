import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

const COOKIE_NAME = "chopdeck_session";
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  acuteWalletId: string;
  walletKycStatus: "none" | "tier1";
}

/** Issue a session row and set the httpOnly cookie. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({ token, userId, expiresAt });

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  store.delete(COOKIE_NAME);
}

/** The signed-in user, or null. Expired sessions are treated as signed out. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const row = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      acuteWalletId: users.acuteWalletId,
      walletKycStatus: users.walletKycStatus,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.token, token))
    .get();

  if (!row || row.expiresAt.getTime() < Date.now()) return null;

  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    acuteWalletId: row.acuteWalletId,
    walletKycStatus: row.walletKycStatus,
  };
}
