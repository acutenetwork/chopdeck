"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toggleListingAction } from "@/lib/store/actions";

export function AvailabilityToggle({
  listingId,
  available,
}: {
  listingId: string;
  available: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleListingAction(listingId);
          if (result.error) toast.error(result.error);
          else router.refresh();
        })
      }
    >
      {available ? "Mark sold out" : "Back on menu"}
    </Button>
  );
}
