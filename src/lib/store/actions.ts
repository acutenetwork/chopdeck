"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";

export interface ListingActionState {
  error?: string;
  ok?: boolean;
}

const listingSchema = z.object({
  title: z.string().min(3, "Give your dish a name."),
  description: z.string().min(10, "Describe the dish in a sentence or two."),
  price: z.number().positive("Enter a price."),
  imageUrl: z.string().url("Paste a link to a photo."),
  category: z.string().min(1),
});

export async function createListingAction(
  _: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const parsed = listingSchema.safeParse({
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    price: Number(String(formData.get("price") ?? "").replace(/[^0-9.]/g, "")),
    imageUrl: String(formData.get("imageUrl") ?? "").trim(),
    category: String(formData.get("category") ?? "Meals"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };

  await db.insert(listings).values({
    id: randomUUID(),
    sellerId: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    priceKobo: Math.round(parsed.data.price * 100),
    imageUrl: parsed.data.imageUrl,
    category: parsed.data.category,
    available: true,
    createdAt: new Date(),
  });

  revalidatePath("/sell");
  revalidatePath("/");
  return { ok: true };
}

/** Sold out / back on the menu. */
export async function toggleListingAction(listingId: string): Promise<ListingActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const listing = await db
    .select({ available: listings.available })
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.sellerId, user.id)))
    .get();
  if (!listing) return { error: "That dish is not yours." };

  await db
    .update(listings)
    .set({ available: !listing.available })
    .where(eq(listings.id, listingId));

  revalidatePath("/sell");
  revalidatePath("/");
  return { ok: true };
}
