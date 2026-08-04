"use server";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AcuteError,
  createBankTransferPayment,
  submitWalletKyc,
  withdrawFromWallet,
} from "@/lib/acute";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users, walletFundings, withdrawals } from "@/lib/db/schema";

export interface WalletActionState {
  error?: string;
  ok?: boolean;
  /** Set by fundWalletAction so the page can show the account to pay into. */
  fundingReference?: string;
}

const kycSchema = z.object({
  bvn: z.string().regex(/^\d{11}$/, "BVN must be 11 digits."),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  gender: z.enum(["male", "female", "other"]),
  phone: z.string().min(6, "Enter your phone number."),
  addressLine1: z.string().min(3, "Enter your address."),
  city: z.string().min(2, "Enter your city."),
  state: z.string().min(2, "Enter your state."),
});

/** Verify the wallet (tier 1). This is what unlocks the balance and cash-out. */
export async function verifyWalletAction(
  _: WalletActionState,
  formData: FormData,
): Promise<WalletActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const parsed = kycSchema.safeParse({
    bvn: String(formData.get("bvn") ?? "").trim(),
    dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim(),
    gender: String(formData.get("gender") ?? "male"),
    phone: String(formData.get("phone") ?? "").trim(),
    addressLine1: String(formData.get("addressLine1") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };

  try {
    const wallet = await submitWalletKyc(user.acuteWalletId, { ...parsed.data, country: "NG" });
    await db
      .update(users)
      .set({ walletKycStatus: wallet.kycStatus })
      .where(eq(users.id, user.id));
  } catch (error) {
    if (error instanceof AcuteError) return { error: error.message };
    throw error;
  }

  revalidatePath("/wallet");
  return { ok: true };
}

/**
 * Top up: a bank-transfer payment whose target is the user's OWN wallet. Acute
 * mints a one-time account number; when the user sends money to it the settlement
 * webhook credits their wallet.
 */
export async function fundWalletAction(
  _: WalletActionState,
  formData: FormData,
): Promise<WalletActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const naira = Number(String(formData.get("amount") ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(naira) || naira < 100) return { error: "Enter at least ₦100." };

  const amountKobo = Math.round(naira * 100);

  try {
    const payment = await createBankTransferPayment({
      baseAmount: amountKobo,
      targetWalletId: user.acuteWalletId,
      description: "Chopdeck wallet top-up",
      customer: { name: user.fullName, email: user.email },
    });

    await db.insert(walletFundings).values({
      id: randomUUID(),
      reference: payment.id,
      userId: user.id,
      walletId: user.acuteWalletId,
      amountKobo: payment.baseAmount,
      payableKobo: payment.payableAmount,
      status: "pending",
      nubanNumber: payment.virtualAccount?.accountNumber ?? null,
      nubanBank: payment.virtualAccount?.bankName ?? null,
      nubanName: payment.virtualAccount?.accountName ?? null,
      expiresAt: payment.expiresAt ? new Date(payment.expiresAt) : null,
      createdAt: new Date(),
    });

    revalidatePath("/wallet");
    return { ok: true, fundingReference: payment.id };
  } catch (error) {
    if (error instanceof AcuteError) return { error: error.message };
    throw error;
  }
}

/** Cash out to a bank account. Acute returns `processing`; the webhook finalises it. */
export async function withdrawAction(
  _: WalletActionState,
  formData: FormData,
): Promise<WalletActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const naira = Number(String(formData.get("amount") ?? "").replace(/[^0-9.]/g, ""));
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const bankCode = String(formData.get("bankCode") ?? "").trim();
  const accountName = String(formData.get("accountName") ?? "").trim();

  if (!Number.isFinite(naira) || naira < 100) return { error: "Enter at least ₦100." };
  if (!/^\d{10}$/.test(accountNumber)) return { error: "Account number must be 10 digits." };
  if (!bankCode) return { error: "Choose a bank." };

  try {
    const result = await withdrawFromWallet(user.acuteWalletId, {
      amount: Math.round(naira * 100),
      accountNumber,
      bankCode,
      accountName: accountName || undefined,
      narration: "Chopdeck payout",
    });

    await db.insert(withdrawals).values({
      id: randomUUID(),
      reference: result.id,
      userId: user.id,
      walletId: user.acuteWalletId,
      amountKobo: result.amount,
      feeKobo: result.fee,
      accountNumber,
      bankCode,
      accountName: accountName || null,
      status: "processing",
      createdAt: new Date(),
    });

    revalidatePath("/wallet");
    return { ok: true };
  } catch (error) {
    if (error instanceof AcuteError) {
      return error.code === "WALLET_INSUFFICIENT_FUNDS"
        ? { error: "Not enough in your wallet for that amount plus the transfer fee." }
        : { error: error.message };
    }
    throw error;
  }
}
