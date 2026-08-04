import { AcuteError, getWalletBalance } from "@/lib/acute";

export interface WalletView {
  /** Null until the wallet is verified — Acute gates the balance read on tier-1 KYC. */
  balance: number | null;
  needsVerification: boolean;
  error?: string;
}

/**
 * Read a wallet's spendable balance. An unverified wallet is a normal state, not a
 * failure: Acute answers `WALLET_KYC_REQUIRED`, and the UI turns that into the
 * "verify to see your balance" prompt.
 */
export async function readWalletBalance(walletId: string): Promise<WalletView> {
  try {
    const { balance } = await getWalletBalance(walletId);
    return { balance, needsVerification: false };
  } catch (error) {
    if (error instanceof AcuteError) {
      if (error.code === "WALLET_KYC_REQUIRED") {
        return { balance: null, needsVerification: true };
      }
      return { balance: null, needsVerification: false, error: error.message };
    }
    throw error;
  }
}
