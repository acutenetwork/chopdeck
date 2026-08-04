import Link from "next/link";
import { redirect } from "next/navigation";

import { FoodCard } from "@/components/store/food-card";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { naira } from "@/lib/format";
import { listAvailableFood } from "@/lib/store/queries";
import { readWalletBalance } from "@/lib/wallet/balance";

export default async function BrowsePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [food, wallet] = await Promise.all([
    listAvailableFood(),
    readWalletBalance(user.acuteWalletId),
  ]);

  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hi {firstName} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">What are you eating today?</p>
        </div>

        <Link
          href="/wallet"
          className="rounded-xl border border-border bg-card px-4 py-2.5 transition-colors hover:bg-muted"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Wallet
          </p>
          <p className="text-lg font-bold tabular-nums">
            {wallet.needsVerification ? "Verify →" : naira(wallet.balance ?? 0)}
          </p>
        </Link>
      </header>

      {food.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No food listed yet. Be the first —{" "}
            <Link href="/sell" className="font-medium text-primary hover:underline">
              open your kitchen
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {food.map((item) => (
            <FoodCard key={item.id} food={item} />
          ))}
        </div>
      )}
    </div>
  );
}
