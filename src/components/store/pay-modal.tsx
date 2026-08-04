"use client";

import { Building2, Loader2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { naira } from "@/lib/format";
import { checkoutAction } from "@/lib/store/checkout";
import { cn } from "@/lib/utils";

/**
 * The buyer's choice at checkout: pay from the wallet balance, or get a one-time
 * account to transfer into. Paying from the wallet is only offered when the balance
 * actually covers the dish — otherwise it is shown, disabled, with the reason.
 */
export function PayModal({
  listingId,
  title,
  priceKobo,
  balanceKobo,
  needsVerification,
  disabled,
}: {
  listingId: string;
  title: string;
  priceKobo: number;
  balanceKobo: number | null;
  needsVerification: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [choice, setChoice] = useState<"wallet" | "transfer" | null>(null);

  const canPayFromWallet = balanceKobo !== null && balanceKobo >= priceKobo;
  const walletReason = needsVerification
    ? "Verify your wallet to pay with it"
    : balanceKobo === null
      ? "Wallet unavailable"
      : `Balance ${naira(balanceKobo)} — not enough`;

  function pay(method: "wallet" | "transfer") {
    setChoice(method);
    startTransition(async () => {
      const result = await checkoutAction(listingId, method);
      if (result.error) {
        toast.error(result.error);
        setChoice(null);
        return;
      }
      if (result.paid) toast.success("Paid. Your order is confirmed.");
      router.push(`/orders/${result.reference}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full" disabled={disabled}>
          {disabled ? "Sold out" : `Buy · ${naira(priceKobo)}`}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How do you want to pay?</DialogTitle>
          <DialogDescription>
            {title} · {naira(priceKobo)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <button
            onClick={() => canPayFromWallet && pay("wallet")}
            disabled={!canPayFromWallet || pending}
            className={cn(
              "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors",
              canPayFromWallet
                ? "border-border hover:border-primary hover:bg-accent/50"
                : "cursor-not-allowed border-dashed border-border opacity-60",
            )}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
              {pending && choice === "wallet" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Wallet className="size-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Pay from wallet</span>
              <span className="block text-xs text-muted-foreground">
                {canPayFromWallet
                  ? `Instant · balance ${naira(balanceKobo)}`
                  : walletReason}
              </span>
            </span>
          </button>

          <button
            onClick={() => pay("transfer")}
            disabled={pending}
            className="flex w-full items-center gap-4 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary hover:bg-accent/50 disabled:opacity-60"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
              {pending && choice === "transfer" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Building2 className="size-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Pay with bank transfer</span>
              <span className="block text-xs text-muted-foreground">
                We give you an account to send to
              </span>
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
