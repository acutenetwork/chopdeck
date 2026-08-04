/** Plain constants: a `"use server"` module may only export async functions. */
export const CATEGORIES = [
  "Meals",
  "Swallow",
  "Rice",
  "Grills",
  "Snacks",
  "Drinks",
  "Soups",
] as const;

/**
 * Chopdeck's cut of every sale. Acute splits it off inside the settlement
 * transaction and credits our settlement wallet, so the seller's wallet is
 * credited net and we never have to move it ourselves.
 *
 * Deliberately NOT applied to wallet top-ups: a user adding their own money to
 * their own wallet is not a sale, and skimming it would be indefensible.
 */
export const PLATFORM_COMMISSION_PERCENT = 15;
