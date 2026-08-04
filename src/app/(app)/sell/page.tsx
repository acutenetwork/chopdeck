import { redirect } from "next/navigation";

import { AvailabilityToggle } from "@/components/sell/availability-toggle";
import { NewListingDialog } from "@/components/sell/new-listing-dialog";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { naira } from "@/lib/format";
import { listMyListings, listMySales } from "@/lib/store/queries";

export default async function SellPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [menu, sales] = await Promise.all([listMyListings(user.id), listMySales(user.id)]);
  const earned = sales.reduce((total, sale) => total + sale.amountKobo, 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My kitchen</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything you sell is paid straight into your wallet.
          </p>
        </div>
        <NewListingDialog />
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Earned
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{naira(earned)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Orders sold
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{sales.length}</p>
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold">My menu</h2>
      {menu.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing on your menu yet. Add your first dish and start earning.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {menu.map((dish) => (
            <li key={dish.id}>
              <Card className="flex flex-row items-center gap-4 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dish.imageUrl}
                  alt={dish.title}
                  className="size-16 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{dish.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{dish.description}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {naira(dish.priceKobo)}
                    {!dish.available ? (
                      <span className="ml-2 text-xs font-medium text-muted-foreground">
                        Sold out
                      </span>
                    ) : null}
                  </p>
                </div>
                <AvailabilityToggle listingId={dish.id} available={dish.available} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
