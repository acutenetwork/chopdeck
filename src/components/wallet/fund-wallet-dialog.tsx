"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { PayAccount } from "@/components/pay-account";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fundWalletAction, type WalletActionState } from "@/lib/wallet/actions";

interface FundingAccount {
  accountNumber: string;
  bankName: string;
  accountName: string;
  payableKobo: number;
  status: string;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Getting your account…" : "Continue"}
    </Button>
  );
}

const QUICK = [1000, 2000, 5000, 10000];

export function FundWalletDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState<FundingAccount | null>(null);
  const [state, action] = useActionState<WalletActionState, FormData>(fundWalletAction, {});

  // Once we have a reference, poll until the transfer settles.
  useEffect(() => {
    const reference = state.fundingReference;
    if (!reference) return;

    let stop = false;
    async function poll() {
      while (!stop) {
        const response = await fetch(`/api/fundings/${reference}/status`, { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as FundingAccount;
          setAccount(data);
          if (data.status === "settled") {
            toast.success("Wallet funded.");
            setOpen(false);
            router.refresh();
            return;
          }
          if (data.status === "expired") {
            toast.error("That account expired before the money arrived.");
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    void poll();
    return () => {
      stop = true;
    };
  }, [state.fundingReference, router]);

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setAccount(null);
      setAmount("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add money
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Send the transfer" : "Add money"}</DialogTitle>
          <DialogDescription>
            {account
              ? "Transfer from your bank app. We credit your wallet automatically."
              : "Top up so you can pay for food straight from your wallet."}
          </DialogDescription>
        </DialogHeader>

        {account ? (
          <div className="space-y-3">
            <PayAccount
              accountNumber={account.accountNumber}
              bankName={account.bankName}
              accountName={account.accountName}
              amountKobo={account.payableKobo}
            />
            <p className="text-center text-sm text-muted-foreground">Waiting for your transfer…</p>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input
                id="amount"
                name="amount"
                inputMode="numeric"
                placeholder="5000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                  >
                    ₦{value.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {state.error ? (
              <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            ) : null}

            <Submit />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
