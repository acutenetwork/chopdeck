"use server";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AcuteError, createWallet } from "@/lib/acute";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export interface AuthState {
  error?: string;
}

const signupSchema = z.object({
  fullName: z.string().min(2, "Tell us your name."),
  email: z.string().email("Enter a valid email."),
  phone: z.string().optional(),
  password: z.string().min(8, "Use at least 8 characters."),
});

/**
 * Sign up. Every Chopdeck user is also an Acute wallet holder, so the wallet is
 * created here, in the same step — there is no "activate wallet later" state where
 * a user exists without somewhere to hold money. If Acute rejects the wallet we
 * fail the signup rather than create a walletless user.
 */
export async function signupAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };

  const { fullName, email, phone, password } = parsed.data;

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (existing) return { error: "That email already has an account. Log in instead." };

  const userId = randomUUID();

  let wallet;
  try {
    wallet = await createWallet({ email, fullName, phone, externalReference: userId });
  } catch (error) {
    if (error instanceof AcuteError) {
      return error.code === "WALLET_EMAIL_TAKEN"
        ? { error: "A wallet already exists for that email." }
        : { error: `Could not create your wallet: ${error.message}` };
    }
    throw error;
  }

  await db.insert(users).values({
    id: userId,
    email,
    passwordHash: await hashPassword(password),
    fullName,
    phone: phone ?? null,
    acuteWalletId: wallet.id,
    walletKycStatus: wallet.kycStatus,
    createdAt: new Date(),
  });

  await createSession(userId);
  redirect("/");
}

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const user = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Wrong email or password." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
