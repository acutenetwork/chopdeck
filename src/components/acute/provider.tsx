"use client";

import { AcuteProvider } from "@acutenetwork/react";

/**
 * One Acute client for the whole app.
 *
 * The publishable key is public on purpose: it goes into the JavaScript bundle
 * and anyone can read it. What makes it safe is the client app it points at —
 * Acute only accepts it from the origins we registered, and the ceilings on that
 * app cap what any single call can ask for. That is the whole trade: no secret
 * in the browser, and no server round trip before the buyer can pay.
 *
 * `apiBase` is only set when we are pointing at a local Acute stack. In
 * production the SDK works it out from the key's own mode, which means a sandbox
 * key can never accidentally talk to the live host.
 */
export function ChopdeckAcuteProvider({
  publishableKey,
  apiBase,
  children,
}: {
  publishableKey: string;
  apiBase?: string;
  children: React.ReactNode;
}) {
  if (!publishableKey) {
    // Loud, not silent. A missing key here means every Pay button on the site
    // does nothing, and without this line the only symptom is a dead button.
    console.error(
      "[chopdeck] NEXT_PUBLIC_ACUTE_PUBLISHABLE_KEY is not set, so on-page checkout is unavailable.",
    );
  }

  return (
    <AcuteProvider publishableKey={publishableKey} apiBase={apiBase}>
      {children}
    </AcuteProvider>
  );
}
