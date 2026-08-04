'use client';

import { ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BANKS } from '@/lib/banks';
import { naira } from '@/lib/format';
import { withdrawAction } from '@/lib/wallet/actions';

export function WithdrawDialog({
  balanceKobo,
  maxWithdrawable,
  maxWithdrawableFee,
}: {
  balanceKobo: number;
  /** The most that can actually be sent once its own fee is added. */
  maxWithdrawable: number;
  maxWithdrawableFee: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [amount, setAmount] = useState('');
  const [pending, startTransition] = useTransition();

  // The gap between the balance and what can leave is the fee — showing it is the
  // whole point: typing the full balance is the obvious thing to do and it always
  // fails, because the fee has to come out of the same wallet.
  const typed = Math.round(Number(amount.replace(/[^0-9.]/g, '')) * 100);
  const overMax = Number.isFinite(typed) && typed > maxWithdrawable;

  function action(formData: FormData) {
    startTransition(async () => {
      const result = await withdrawAction({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success('Cash-out sent — it lands shortly.');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowUpRight className="size-4" />
          Cash out
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cash out</DialogTitle>
          <DialogDescription>
            Your bank charges a transfer fee, so the most you can send is a little under your
            balance.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Wallet balance</span>
            <span className="font-medium tabular-nums">{naira(balanceKobo)}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-muted-foreground">Withdrawal fee</span>
            <span className="font-medium tabular-nums">-{naira(maxWithdrawableFee)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <span className="font-medium">You can withdraw</span>
            <span className="font-semibold tabular-nums">{naira(maxWithdrawable)}</span>
          </div>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">Amount (₦)</Label>
              <button
                type="button"
                onClick={() => setAmount(String(maxWithdrawable / 100))}
                className="text-xs font-medium text-primary hover:underline"
              >
                Send everything
              </button>
            </div>
            <Input
              id="amount"
              name="amount"
              inputMode="numeric"
              placeholder="2000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
            {overMax ? (
              <p className="text-xs text-destructive">
                That is more than you can send. The most is {naira(maxWithdrawable)} once the{' '}
                {naira(maxWithdrawableFee)} fee is added.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankCode">Bank</Label>
            <select
              id="bankCode"
              name="bankCode"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
              defaultValue="000013"
            >
              {BANKS.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account number</Label>
            <Input
              id="accountNumber"
              name="accountNumber"
              inputMode="numeric"
              maxLength={10}
              placeholder="0123456789"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountName">Account name (optional)</Label>
            <Input id="accountName" name="accountName" placeholder="As it appears at your bank" />
          </div>

          {error ? (
            <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={pending || overMax || maxWithdrawable <= 0}
          >
            {pending ? 'Sending…' : 'Cash out'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
