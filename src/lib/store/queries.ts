import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { listings, orders, users, walletFundings, withdrawals } from "@/lib/db/schema";

export interface FoodListing {
  id: string;
  title: string;
  description: string;
  priceKobo: number;
  imageUrl: string;
  category: string;
  available: boolean;
  sellerId: string;
  sellerName: string;
  sellerWalletId: string;
}

const listingSelect = {
  id: listings.id,
  title: listings.title,
  description: listings.description,
  priceKobo: listings.priceKobo,
  imageUrl: listings.imageUrl,
  category: listings.category,
  available: listings.available,
  sellerId: listings.sellerId,
  sellerName: users.fullName,
  sellerWalletId: users.acuteWalletId,
};

/** Everything on sale right now, newest first. */
export function listAvailableFood(): Promise<FoodListing[]> {
  return db
    .select(listingSelect)
    .from(listings)
    .innerJoin(users, eq(users.id, listings.sellerId))
    .where(eq(listings.available, true))
    .orderBy(desc(listings.createdAt))
    .all();
}

export function getFoodListing(id: string): Promise<FoodListing | undefined> {
  return db
    .select(listingSelect)
    .from(listings)
    .innerJoin(users, eq(users.id, listings.sellerId))
    .where(eq(listings.id, id))
    .get();
}

export function listMyListings(sellerId: string) {
  return db
    .select()
    .from(listings)
    .where(eq(listings.sellerId, sellerId))
    .orderBy(desc(listings.createdAt))
    .all();
}

export function listMyOrders(buyerId: string) {
  return db
    .select()
    .from(orders)
    .where(eq(orders.buyerId, buyerId))
    .orderBy(desc(orders.createdAt))
    .all();
}

export function listMySales(sellerId: string) {
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.sellerId, sellerId), eq(orders.status, "paid")))
    .orderBy(desc(orders.createdAt))
    .all();
}

export function getOrderByReference(reference: string) {
  return db.select().from(orders).where(eq(orders.reference, reference)).get();
}

export function listMyFundings(userId: string) {
  return db
    .select()
    .from(walletFundings)
    .where(eq(walletFundings.userId, userId))
    .orderBy(desc(walletFundings.createdAt))
    .all();
}

export interface MoneyIn {
  id: string;
  kind: "topup" | "sale";
  label: string;
  amountKobo: number;
  status: string;
  createdAt: Date;
}

/**
 * Everything that put money in this wallet: top-ups the user sent, and food they
 * sold. Both are real credits, so the wallet shows them in one list.
 */
export async function listMoneyIn(userId: string): Promise<MoneyIn[]> {
  const [topups, sales] = await Promise.all([listMyFundings(userId), listMySales(userId)]);

  const entries: MoneyIn[] = [
    ...topups.map((topup) => ({
      id: topup.id,
      kind: "topup" as const,
      label: "Wallet top-up",
      amountKobo: topup.amountKobo,
      status: topup.status,
      createdAt: topup.createdAt,
    })),
    ...sales.map((sale) => ({
      id: sale.id,
      kind: "sale" as const,
      label: `Sold: ${sale.listingTitle}`,
      amountKobo: sale.amountKobo,
      status: sale.status,
      createdAt: sale.createdAt,
    })),
  ];

  return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function listMyWithdrawals(userId: string) {
  return db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.userId, userId))
    .orderBy(desc(withdrawals.createdAt))
    .all();
}
