import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <UtensilsCrossed className="size-4.5" strokeWidth={2.25} />
      </span>
      <span className="text-lg font-bold tracking-tight">Chopdeck</span>
    </Link>
  );
}
