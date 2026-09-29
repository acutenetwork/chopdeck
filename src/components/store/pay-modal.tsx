"use client";

import { Building2, Loader2, Wallet, Zap } from "lucide-react";
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
import { useAcutePayment } from "@acutenetwork/react";

import { naira } from "@/lib/format";
import { checkoutAction } from "@/lib/store/checkout";
import { cn } from "@/lib/utils";

/**
 * The buyer's choice at checkout.
 *
 * Three routes now, and the first one is new: Acute's checkout opens over this
 * page instead of sending the buyer somewhere else. It is the same bank transfer
 * underneath, so the seller's money arrives exactly as it always did; what
 * changes is that the buyer never leaves Chopdeck, which is the entire point of
 * the SDK.
 *
 * The other two stay because they do something the embedded one cannot: the
 * wallet route settles instantly from a balance, and the redirect route is what
 * a buyer with a blocked iframe falls back to.
 */
export function PayModal({
  listingId,
  title,
  priceKobo,
  balanceKobo,
  needsVerification,
  buyerEmail,
  buyerName,
  disabled,
}: {
  listingId: string;
  title: string;
  priceKobo: number;
  balanceKobo: number | null;
  needsVerification: boolean;
  /** The signed-in buyer. Acute requires an address on every payment, and this
   *  is the one we already hold, so nobody is asked for it twice. */
  buyerEmail: string;
  buyerName: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [choice, setChoice] = useState<"wallet" | "transfer" | null>(null);

  /**
   * The embedded route.
   *
   * No amount validation, no idempotency key, no session handling here: the SDK
   * mints the key per (key, amount, currency) and holds it for the tab, so a
   * buyer who closes the sheet and taps Buy again lands back on the SAME
   * one-time account rather than a second one.
   *
   * `onSettled` moves the UI. It is NOT what confirms the order: the Acute
   * webhook to `/api/webhooks/acute` is, and it is what marks the row paid even
   * if this browser is closed the instant the money lands.
   */
  const acute = useAcutePayment({
    onSettled: () => {
      toast.success("Paid. Your order is confirmed.");
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });

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
            onClick={() =>
              void acute.pay({
                amount: priceKobo,
                description: title,
                // Required by Acute, and it is how the buyer gets their receipt.
                customer: { email: buyerEmail, name: buyerName },
                metadata: { listingId },
              })
            }
            disabled={acute.loading || pending}
            className="flex w-full items-center gap-4 rounded-xl border border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:border-primary hover:bg-primary/10 disabled:opacity-60"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              {acute.loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Zap className="size-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Pay here</span>
              <span className="block text-xs text-muted-foreground">
                Bank transfer, without leaving this page
              </span>
            </span>
          </button>

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
              <span className="block text-sm font-semibold">Pay on a separate page</span>
              <span className="block text-xs text-muted-foreground">
                Opens Acute&apos;s checkout in a new page
              </span>
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
