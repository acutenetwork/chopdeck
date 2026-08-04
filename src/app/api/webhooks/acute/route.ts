import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { orders, walletFundings, webhookEvents, withdrawals } from "@/lib/db/schema";
import { verifyAcuteSignature, type AcuteEvent } from "@/lib/webhook-verify";

export const runtime = "nodejs";

/**
 * The single receiver for every Acute event. Verify the signature over the RAW
 * body, dedupe on the event id (delivery is at-least-once), then apply the state
 * change. A settled payment is either a wallet top-up or an order, told apart by
 * which table owns the reference.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.ACUTE_WEBHOOK_SECRET ?? "";

  if (!verifyAcuteSignature(raw, request.headers.get("x-acute-signature"), secret)) {
    return new NextResponse("invalid signature", { status: 400 });
  }

  let event: AcuteEvent<{ id?: string }>;
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }

  // The event id is the primary key, so a redelivery is a no-op insert.
  try {
    await db.insert(webhookEvents).values({
      eventId: event.id,
      type: event.type,
      resourceId: event.data?.id ?? null,
      payload: raw,
      receivedAt: new Date(),
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const reference = event.data?.id;
  if (reference) {
    switch (event.type) {
      case "payment.settled": {
        const now = new Date();
        await db
          .update(orders)
          .set({ status: "paid", paidAt: now })
          .where(eq(orders.reference, reference));
        await db
          .update(walletFundings)
          .set({ status: "settled", settledAt: now })
          .where(eq(walletFundings.reference, reference));
        break;
      }
      case "payment.expired":
        await db.update(orders).set({ status: "expired" }).where(eq(orders.reference, reference));
        await db
          .update(walletFundings)
          .set({ status: "expired" })
          .where(eq(walletFundings.reference, reference));
        break;
      case "payment.refunded":
        await db.update(orders).set({ status: "refunded" }).where(eq(orders.reference, reference));
        break;
      case "withdrawal.completed":
        await db
          .update(withdrawals)
          .set({ status: "completed" })
          .where(eq(withdrawals.reference, reference));
        break;
      case "withdrawal.failed":
        await db
          .update(withdrawals)
          .set({ status: "failed" })
          .where(eq(withdrawals.reference, reference));
        break;
    }
  }

  return NextResponse.json({ ok: true });
}
