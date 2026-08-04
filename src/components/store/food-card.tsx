import Link from "next/link";

import { naira } from "@/lib/format";
import type { FoodListing } from "@/lib/store/queries";

export function FoodCard({ food }: { food: FoodListing }) {
  return (
    <Link
      href={`/food/${food.id}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={food.imageUrl}
          alt={food.title}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
          {food.category}
        </span>
      </div>
      <div className="p-4">
        <p className="truncate text-sm font-semibold">{food.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">by {food.sellerName}</p>
        <p className="mt-2 text-base font-bold tabular-nums">{naira(food.priceKobo)}</p>
      </div>
    </Link>
  );
}
