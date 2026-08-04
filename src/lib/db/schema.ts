import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Chopdeck's own data. Acute owns the money: balances, payments and withdrawals
 * live there, and we join to them by their `acuinf…` reference. We never mirror a
 * balance — we read it from Acute.
 */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  /** The user's Acute wallet reference, created at signup. */
  acuteWalletId: text("acute_wallet_id").notNull(),
  /** Mirrors Acute's wallet KYC status so we can gate UI without a round trip. */
  walletKycStatus: text("wallet_kyc_status", { enum: ["none", "tier1"] })
    .notNull()
    .default("none"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const listings = sqliteTable(
  "listings",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    priceKobo: integer("price_kobo").notNull(),
    imageUrl: text("image_url").notNull(),
    category: text("category").notNull().default("Meals"),
    available: integer("available", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("listings_seller_idx").on(table.sellerId)],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    /** Acute's payment reference — the join key to the money. */
    reference: text("reference").notNull().unique(),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => users.id),
    sellerId: text("seller_id")
      .notNull()
      .references(() => users.id),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id),
    listingTitle: text("listing_title").notNull(),
    sellerWalletId: text("seller_wallet_id").notNull(),
    method: text("method", { enum: ["wallet", "transfer"] }).notNull(),
    amountKobo: integer("amount_kobo").notNull(),
    /** What the buyer actually pays (base + Acute's fee). */
    payableKobo: integer("payable_kobo").notNull(),
    status: text("status", {
      enum: ["pending", "paid", "expired", "failed", "refunded"],
    })
      .notNull()
      .default("pending"),
    /** The one-time NUBAN, for transfer orders. */
    nubanNumber: text("nuban_number"),
    nubanBank: text("nuban_bank"),
    nubanName: text("nuban_name"),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    paidAt: integer("paid_at", { mode: "timestamp" }),
  },
  (table) => [
    index("orders_buyer_idx").on(table.buyerId),
    index("orders_seller_idx").on(table.sellerId),
  ],
);

export const walletFundings = sqliteTable(
  "wallet_fundings",
  {
    id: text("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    walletId: text("wallet_id").notNull(),
    amountKobo: integer("amount_kobo").notNull(),
    payableKobo: integer("payable_kobo").notNull(),
    status: text("status", { enum: ["pending", "settled", "expired"] })
      .notNull()
      .default("pending"),
    nubanNumber: text("nuban_number"),
    nubanBank: text("nuban_bank"),
    nubanName: text("nuban_name"),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    settledAt: integer("settled_at", { mode: "timestamp" }),
  },
  (table) => [index("wallet_fundings_user_idx").on(table.userId)],
);

export const withdrawals = sqliteTable(
  "withdrawals",
  {
    id: text("id").primaryKey(),
    reference: text("reference").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    walletId: text("wallet_id").notNull(),
    amountKobo: integer("amount_kobo").notNull(),
    feeKobo: integer("fee_kobo").notNull().default(0),
    accountNumber: text("account_number").notNull(),
    bankCode: text("bank_code").notNull(),
    accountName: text("account_name"),
    status: text("status", { enum: ["processing", "completed", "failed"] })
      .notNull()
      .default("processing"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("withdrawals_user_idx").on(table.userId)],
);

/** Every verified webhook, keyed on Acute's event id so redelivery is a no-op. */
export const webhookEvents = sqliteTable("webhook_events", {
  eventId: text("event_id").primaryKey(),
  type: text("type").notNull(),
  resourceId: text("resource_id"),
  payload: text("payload").notNull(),
  receivedAt: integer("received_at", { mode: "timestamp" }).notNull(),
});
