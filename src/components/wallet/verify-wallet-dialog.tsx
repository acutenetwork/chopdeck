"use client";

import { ShieldCheck } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyWalletAction } from "@/lib/wallet/actions";

export function VerifyWalletDialog({ triggerLabel = "Verify wallet" }: { triggerLabel?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function action(formData: FormData) {
    startTransition(async () => {
      const result = await verifyWalletAction({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Wallet verified — your balance is now visible.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <ShieldCheck className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify your wallet</DialogTitle>
          <DialogDescription>
            A one-time check that unlocks your balance and lets you cash out.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="bvn">BVN</Label>
            <Input id="bvn" name="bvn" inputMode="numeric" maxLength={11} placeholder="11 digits" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                name="gender"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                defaultValue="female"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" placeholder="08012345678" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address</Label>
            <Input id="addressLine1" name="addressLine1" placeholder="12 Adeola Odeku Street" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" placeholder="Lagos" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" placeholder="Lagos" required />
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Verifying…" : "Verify my wallet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
