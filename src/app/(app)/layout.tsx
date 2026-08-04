import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth/session";

/** Everything inside this group requires a session; the shell renders the nav. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <AppShell user={{ fullName: user.fullName, email: user.email }}>{children}</AppShell>;
}
