import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ChopdeckAcuteProvider } from "@/components/acute/provider";
import { getCurrentUser } from "@/lib/auth/session";

/** Everything inside this group requires a session; the shell renders the nav. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ChopdeckAcuteProvider
      publishableKey={process.env.NEXT_PUBLIC_ACUTE_PUBLISHABLE_KEY ?? ""}
      apiBase={process.env.NEXT_PUBLIC_ACUTE_API_BASE}
    >
      <AppShell user={{ fullName: user.fullName, email: user.email }}>{children}</AppShell>
    </ChopdeckAcuteProvider>
  );
}
