import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getPayment } from "@/lib/acute";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { walletFundings } from "@/lib/db/schema";

/**
 * Poll a top-up. The webhook is what settles it; this endpoint also reconciles
 * straight from Acute so a delayed webhook never leaves the screen stuck.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const { reference } = await params;
  const funding = await db
    .select()
    .from(walletFundings)
    .where(eq(walletFundings.reference, reference))
    .get();

  if (!funding || funding.userId !== user.id) {
    return new NextResponse("not found", { status: 404 });
  }

  let status = funding.status;
  if (status === "pending") {
    const payment = await getPayment(reference);
    if (payment.status === "settled") {
      status = "settled";
      await db
        .update(walletFundings)
        .set({ status, settledAt: new Date() })
        .where(eq(walletFundings.reference, reference));
    } else if (payment.status === "expired") {
      status = "expired";
      await db
        .update(walletFundings)
        .set({ status })
        .where(eq(walletFundings.reference, reference));
    }
  }

  return NextResponse.json({
    accountNumber: funding.nubanNumber ?? "",
    bankName: funding.nubanBank ?? "",
    accountName: funding.nubanName ?? "",
    payableKobo: funding.payableKobo,
    status,
  });
}
