/**
 * The Acute merchant API response shapes we consume. Written by hand from the
 * public API docs — exactly what an external developer does. All money is an
 * integer number of kobo; every `id` is Acute's `acuinf…` reference string.
 */

export type WalletKycStatus = "none" | "tier1";

export interface Wallet {
  id: string;
  kind: "settlement" | "end_user";
  email: string;
  fullName: string | null;
  phone: string | null;
  externalReference: string | null;
  kycStatus: WalletKycStatus;
  status: "active" | "frozen" | "closed";
  currency: string;
  createdAt: string;
}

export interface WalletBalance {
  walletId: string;
  balance: number;
  currency: string;
}

export type PaymentStatus =
  | "pending"
  | "partial"
  | "settled"
  | "expired"
  | "failed"
  | "refunded"
  | "partially_refunded";

export interface VirtualAccount {
  accountNumber: string;
  bankName: string;
  accountName: string;
  expiresAt: string | null;
}

export interface Payment {
  id: string;
  method: "bank_transfer" | "virtual_wallet";
  status: PaymentStatus;
  baseAmount: number;
  fee: number;
  payableAmount: number;
  amountReceived: number;
  currency: string;
  targetWalletId: string;
  description: string | null;
  expiresAt: string | null;
  settledAt: string | null;
  createdAt: string;
  virtualAccount: VirtualAccount | null;
}

/** What a withdrawal costs, and the most this wallet can actually send. */
export interface WithdrawalQuote {
  walletId: string;
  balance: number;
  amount: number | null;
  fee: number | null;
  total: number | null;
  affordable: boolean | null;
  maxWithdrawable: number;
  maxWithdrawableFee: number;
  currency: string;
}

export interface Withdrawal {
  id: string;
  sourceWalletId: string;
  amount: number;
  fee: number;
  totalAmount: number;
  status: "processing" | "completed" | "failed" | "returned";
  counterparty: {
    accountNumber: string;
    accountName: string | null;
    bankCode: string;
    bankName: string | null;
  };
  failureReason: string | null;
  currency: string;
  createdAt: string;
  completedAt: string | null;
}

/** The KYC payload that lifts a wallet to tier 1 (stored by Acute, merchant-attested). */
export interface WalletKycInput {
  bvn: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country?: string;
  postalCode?: string;
}

/**
 * The merchant's own cut of a payment, split off inside Acute's settlement
 * transaction. Exactly one of `percentage` or `amount`; computed on the base
 * amount, never on the fees the payer adds on top. Always credited to the
 * merchant's own settlement wallet — the destination is not configurable.
 */
export type PaymentCommission = { percentage: number } | { amount: number };
