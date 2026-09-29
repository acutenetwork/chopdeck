import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PayModal } from "@/components/store/pay-modal";
import { getCurrentUser } from "@/lib/auth/session";
import { naira } from "@/lib/format";
import { getFoodListing } from "@/lib/store/queries";
import { readWalletBalance } from "@/lib/wallet/balance";

export default async function FoodPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const food = await getFoodListing(id);
  if (!food) notFound();

  const wallet = await readWalletBalance(user.acuteWalletId);
  const isMine = food.sellerId === user.id;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-6">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="aspect-16/10 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={food.imageUrl} alt={food.title} className="size-full object-cover" />
        </div>

        <div className="p-6">
          <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
            {food.category}
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{food.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">by {food.sellerName}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{food.description}</p>

          <p className="mt-6 text-3xl font-bold tracking-tight tabular-nums">
            {naira(food.priceKobo)}
          </p>

          <div className="mt-5">
            {isMine ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                This is your dish. Manage it in{" "}
                <Link href="/sell" className="font-medium text-primary hover:underline">
                  your kitchen
                </Link>
                .
              </p>
            ) : (
              <PayModal
                listingId={food.id}
                title={food.title}
                priceKobo={food.priceKobo}
                balanceKobo={wallet.balance}
                needsVerification={wallet.needsVerification}
                buyerEmail={user.email}
                buyerName={user.fullName}
                disabled={!food.available}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
