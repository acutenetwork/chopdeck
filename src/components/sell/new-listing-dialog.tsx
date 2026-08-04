"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createListingAction } from "@/lib/store/actions";
import { CATEGORIES } from "@/lib/store/constants";

export function NewListingDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function action(formData: FormData) {
    startTransition(async () => {
      const result = await createListingAction({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Added to your menu.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add a dish
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a dish</DialogTitle>
          <DialogDescription>
            Buyers pay you directly — the money lands in your wallet.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="title">Dish</Label>
            <Input id="title" name="title" placeholder="Jollof rice & grilled chicken" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Smoky party jollof with a quarter chicken and fried plantain."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price">Price (₦)</Label>
              <Input id="price" name="price" inputMode="numeric" placeholder="3500" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                defaultValue="Rice"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Photo URL</Label>
            <Input
              id="imageUrl"
              name="imageUrl"
              type="url"
              placeholder="https://images.unsplash.com/…"
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Adding…" : "Put it on the menu"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
