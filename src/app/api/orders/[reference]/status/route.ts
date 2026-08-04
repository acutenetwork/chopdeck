import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getPayment } from "@/lib/acute";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";

/**
 * Poll an order. The settlement webhook is the primary path; this also reconciles
 * against Acute so a slow webhook never strands the buyer on a "waiting" screen.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const { reference } = await params;
  const order = await db.select().from(orders).where(eq(orders.reference, reference)).get();
  if (!order || (order.buyerId !== user.id && order.sellerId !== user.id)) {
    return new NextResponse("not found", { status: 404 });
  }

  let status = order.status;
  if (status === "pending") {
    const payment = await getPayment(reference);
    if (payment.status === "settled") {
      status = "paid";
      await db
        .update(orders)
        .set({ status, paidAt: new Date() })
        .where(eq(orders.reference, reference));
    } else if (payment.status === "expired") {
      status = "expired";
      await db.update(orders).set({ status }).where(eq(orders.reference, reference));
    }
  }

  return NextResponse.json({ status });
}
