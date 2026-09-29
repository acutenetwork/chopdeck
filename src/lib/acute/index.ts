import { acute, acuteList, idem } from "./client";

import type {
  Payment,
  Wallet,
  WalletBalance,
  WalletKycInput,
  Withdrawal,
  WithdrawalQuote,
} from "./types";

import type { PaymentCommission } from "./types";

export { AcuteError, idem } from "./client";
export type * from "./types";

/* ── Wallets ─────────────────────────────────────────────────────────────── */

/** Every Chopdeck user gets one of these the moment they sign up. */
export function createWallet(input: {
  email: string;
  fullName?: string;
  phone?: string;
  externalReference?: string;
}): Promise<Wallet> {
  return acute<Wallet>("/v1/wallets", { method: "POST", body: input });
}

export function getWallet(walletId: string): Promise<Wallet> {
  return acute<Wallet>(`/v1/wallets/${walletId}`);
}

/** Lifts the wallet to tier 1, which is what unlocks reading its balance. */
export function submitWalletKyc(walletId: string, input: WalletKycInput): Promise<Wallet> {
  return acute<Wallet>(`/v1/wallets/${walletId}/kyc`, { method: "POST", body: input });
}

/** Requires tier-1 KYC; throws `AcuteError` with code `WALLET_KYC_REQUIRED` otherwise. */
export function getWalletBalance(walletId: string): Promise<WalletBalance> {
  return acute<WalletBalance>(`/v1/wallets/${walletId}/balance`);
}

/* ── Payments ────────────────────────────────────────────────────────────── */

/**
 * A bank-transfer collection: Acute mints a one-time NUBAN, and the money settles
 * into `targetWalletId` (a seller's wallet at checkout, or the user's own wallet
 * when they are topping up).
 */
export function createBankTransferPayment(input: {
  baseAmount: number;
  targetWalletId: string;
  /** Chopdeck's cut, split off inside Acute's settlement. Omit for top-ups. */
  commission?: PaymentCommission;
  description?: string;
  /** Acute requires the payer's email: a payment with no address means the
   *  buyer transfers into a bare account number and never gets a receipt. */
  customer: { email: string; name?: string };
  expiresIn?: number;
}): Promise<Payment> {
  return acute<Payment>("/v1/payments", {
    method: "POST",
    idempotencyKey: idem(),
    body: { method: "bank_transfer", ...input },
  });
}

/** The wallet-funded half of checkout: create the payment, then settle it from a wallet. */
export function createWalletPayment(input: {
  baseAmount: number;
  targetWalletId: string;
  commission?: PaymentCommission;
  description?: string;
}): Promise<Payment> {
  return acute<Payment>("/v1/payments", {
    method: "POST",
    idempotencyKey: idem(),
    body: { method: "virtual_wallet", ...input },
  });
}

/** Settle a `virtual_wallet` payment from the buyer's wallet. Instant. */
export function payFromWallet(sourceWalletId: string, paymentId: string): Promise<Payment> {
  return acute<Payment>(`/v1/wallets/${sourceWalletId}/pay`, {
    method: "POST",
    idempotencyKey: `pay:${paymentId}`,
    body: { paymentId },
  });
}

export function getPayment(paymentId: string): Promise<Payment> {
  return acute<Payment>(`/v1/payments/${paymentId}`);
}

export function listPayments(query?: { limit?: number; cursor?: string; status?: string }) {
  return acuteList<Payment>("/v1/payments", query);
}

/* ── Withdrawals ─────────────────────────────────────────────────────────── */

/**
 * Price a withdrawal without making one. Acute owns the fee schedule (it is
 * per-merchant overridable), so this is the only correct way to show a fee or a
 * "withdraw everything" figure.
 */
export function quoteWithdrawal(
  walletId: string,
  amountKobo?: number,
): Promise<WithdrawalQuote> {
  return acute<WithdrawalQuote>(`/v1/wallets/${walletId}/withdrawals/quote`, {
    query: amountKobo ? { amount: amountKobo } : undefined,
  });
}

/** Cash out a wallet to a Nigerian bank account. */
export function withdrawFromWallet(
  walletId: string,
  input: {
    amount: number;
    accountNumber: string;
    bankCode: string;
    accountName?: string;
    narration?: string;
  },
): Promise<Withdrawal> {
  return acute<Withdrawal>(`/v1/wallets/${walletId}/withdraw`, {
    method: "POST",
    idempotencyKey: idem(),
    body: input,
  });
}
