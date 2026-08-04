"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { nairaExact } from "@/lib/format";

/**
 * The one-time account to pay into. Shown for both wallet top-ups and
 * pay-with-transfer checkouts.
 */
export function PayAccount({
  accountNumber,
  bankName,
  accountName,
  amountKobo,
}: {
  accountNumber: string;
  bankName: string;
  accountName: string;
  amountKobo: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Transfer exactly
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
        {nairaExact(amountKobo)}
      </p>

      <div className="mt-4 space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Account number</span>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 font-mono text-base font-semibold hover:text-primary"
          >
            {accountNumber}
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          </button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Bank</span>
          <span className="font-medium">{bankName}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Account name</span>
          <span className="truncate font-medium">{accountName}</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        This account is for this payment only and expires shortly. We confirm the moment the
        money lands.
      </p>
    </div>
  );
}
