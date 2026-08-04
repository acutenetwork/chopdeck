"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  AcuteError,
  createBankTransferPayment,
  createWalletPayment,
  payFromWallet,
} from "@/lib/acute";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { PLATFORM_COMMISSION_PERCENT } from "@/lib/store/constants";
import { getFoodListing } from "@/lib/store/queries";

export interface CheckoutResult {
  error?: string;
  /** Set on success: where to send the buyer to watch/complete the order. */
  reference?: string;
  /** True when the money already moved (wallet payment settles instantly). */
  paid?: boolean;
}

/**
 * Buy a dish. Both routes create an Acute payment whose target is the SELLER's
 * wallet, so revenue never passes through a Chopdeck account:
 *   - "wallet"   → a virtual_wallet payment settled from the buyer's wallet. Instant.
 *   - "transfer" → a bank_transfer payment with a one-time account; the settlement
 *                  webhook marks the order paid.
 */
export async function checkoutAction(
  listingId: string,
  method: "wallet" | "transfer",
): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const listing = await getFoodListing(listingId);
  if (!listing) return { error: "That dish is no longer listed." };
  if (!listing.available) return { error: "That dish just sold out." };
  if (listing.sellerId === user.id) return { error: "That is your own dish." };

  const orderId = randomUUID();

  try {
    if (method === "wallet") {
      const payment = await createWalletPayment({
        baseAmount: listing.priceKobo,
        targetWalletId: listing.sellerWalletId,
        commission: { percentage: PLATFORM_COMMISSION_PERCENT },
        description: listing.title,
      });

      // Two calls by design: the payment is the order's identity, then the wallet
      // settles it. If the settle fails, the payment stays pending and the buyer
      // can retry or switch to a transfer.
      const settled = await payFromWallet(user.acuteWalletId, payment.id);

      await db.insert(orders).values({
        id: orderId,
        reference: payment.id,
        buyerId: user.id,
        sellerId: listing.sellerId,
        listingId: listing.id,
        listingTitle: listing.title,
        sellerWalletId: listing.sellerWalletId,
        method: "wallet",
        amountKobo: payment.baseAmount,
        payableKobo: payment.payableAmount,
        status: settled.status === "settled" ? "paid" : "pending",
        createdAt: new Date(),
        paidAt: settled.status === "settled" ? new Date() : null,
      });

      revalidatePath("/orders");
      return { reference: payment.id, paid: settled.status === "settled" };
    }

    const payment = await createBankTransferPayment({
      baseAmount: listing.priceKobo,
      targetWalletId: listing.sellerWalletId,
      commission: { percentage: PLATFORM_COMMISSION_PERCENT },
      description: listing.title,
      customer: { name: user.fullName, email: user.email },
    });

    await db.insert(orders).values({
      id: orderId,
      reference: payment.id,
      buyerId: user.id,
      sellerId: listing.sellerId,
      listingId: listing.id,
      listingTitle: listing.title,
      sellerWalletId: listing.sellerWalletId,
      method: "transfer",
      amountKobo: payment.baseAmount,
      payableKobo: payment.payableAmount,
      status: "pending",
      nubanNumber: payment.virtualAccount?.accountNumber ?? null,
      nubanBank: payment.virtualAccount?.bankName ?? null,
      nubanName: payment.virtualAccount?.accountName ?? null,
      expiresAt: payment.expiresAt ? new Date(payment.expiresAt) : null,
      createdAt: new Date(),
    });

    revalidatePath("/orders");
    return { reference: payment.id, paid: false };
  } catch (error) {
    if (error instanceof AcuteError) {
      if (error.code === "WALLET_INSUFFICIENT_FUNDS") {
        return { error: "Not enough in your wallet. Add money or pay by transfer." };
      }
      return { error: error.message };
    }
    throw error;
  }
}
