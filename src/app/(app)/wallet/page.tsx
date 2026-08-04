import { ArrowDownLeft, ArrowUpRight, ShieldCheck, UtensilsCrossed } from "lucide-react";
import { redirect } from "next/navigation";

import { StatusPill } from "@/components/status-pill";
import { Card } from "@/components/ui/card";
import { FundWalletDialog } from "@/components/wallet/fund-wallet-dialog";
import { VerifyWalletDialog } from "@/components/wallet/verify-wallet-dialog";
import { WithdrawDialog } from "@/components/wallet/withdraw-dialog";
import { quoteWithdrawal } from "@/lib/acute";
import { getCurrentUser } from "@/lib/auth/session";
import { naira, nairaExact, shortDate } from "@/lib/format";
import { listMoneyIn, listMyWithdrawals } from "@/lib/store/queries";
import { readWalletBalance } from "@/lib/wallet/balance";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [wallet, moneyIn, cashouts] = await Promise.all([
    readWalletBalance(user.acuteWalletId),
    listMoneyIn(user.id),
    listMyWithdrawals(user.id),
  ]);

  // Acute owns the fee schedule, so the withdrawable ceiling has to come from it —
  // this is what stops "I typed my whole balance and got an error".
  const quote = wallet.needsVerification
    ? null
    : await quoteWithdrawal(user.acuteWalletId).catch(() => null);

  const balance = wallet.balance ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Money you add here pays for food in one tap. Money you earn selling lands here too.
      </p>

      <Card className="mt-6 gap-0 overflow-hidden p-0">
        <div className="bg-primary px-6 py-7 text-primary-foreground">
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">
            Available balance
          </p>
          {wallet.needsVerification ? (
            <>
              <p className="mt-2 text-3xl font-bold tracking-tight">₦•••••</p>
              <p className="mt-2 max-w-sm text-sm opacity-90">
                Verify your wallet to see your balance and cash out.
              </p>
            </>
          ) : (
            <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums">
              {nairaExact(balance)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-6 py-4">
          {wallet.needsVerification ? (
            <VerifyWalletDialog />
          ) : (
            <>
              <FundWalletDialog />
              <WithdrawDialog
                balanceKobo={balance}
                maxWithdrawable={quote?.maxWithdrawable ?? 0}
                maxWithdrawableFee={quote?.maxWithdrawableFee ?? 0}
              />
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-success">
                <ShieldCheck className="size-3.5" /> Verified
              </span>
            </>
          )}
        </div>
      </Card>

      {wallet.error ? (
        <p className="mt-4 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {wallet.error}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Money in</h2>
        <Card className="gap-0 overflow-hidden p-0">
          {moneyIn.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Nothing yet. Add money, or sell some food.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {moneyIn.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="grid size-9 place-items-center rounded-full bg-success/12 text-success">
                    {entry.kind === "sale" ? (
                      <UtensilsCrossed className="size-4" />
                    ) : (
                      <ArrowDownLeft className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.label}</p>
                    <p className="text-xs text-muted-foreground">{shortDate(entry.createdAt)}</p>
                  </div>
                  <StatusPill status={entry.status} />
                  <span className="w-24 text-right text-sm font-semibold tabular-nums">
                    {naira(entry.amountKobo)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Money out</h2>
        <Card className="gap-0 overflow-hidden p-0">
          {cashouts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No cash-outs yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {cashouts.map((cashout) => (
                <li key={cashout.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
                    <ArrowUpRight className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      To {cashout.accountName ?? cashout.accountNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {shortDate(cashout.createdAt)}
                    </p>
                  </div>
                  <StatusPill status={cashout.status} />
                  <span className="w-24 text-right text-sm font-semibold tabular-nums">
                    -{naira(cashout.amountKobo)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
