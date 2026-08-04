import Link from "next/link";
import { redirect } from "next/navigation";

import { StatusPill } from "@/components/status-pill";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/session";
import { naira, timeAgo } from "@/lib/format";
import { listMyOrders, listMySales } from "@/lib/store/queries";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [bought, sold] = await Promise.all([listMyOrders(user.id), listMySales(user.id)]);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Orders</h1>

      <Tabs defaultValue="bought">
        <TabsList>
          <TabsTrigger value="bought">I bought ({bought.length})</TabsTrigger>
          <TabsTrigger value="sold">I sold ({sold.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="bought" className="mt-4">
          {bought.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing yet.{" "}
                <Link href="/" className="font-medium text-primary hover:underline">
                  Find something to eat
                </Link>
                .
              </p>
            </Card>
          ) : (
            <ul className="space-y-2.5">
              {bought.map((order) => (
                <li key={order.id}>
                  <Link href={`/orders/${order.reference}`}>
                    <Card className="flex flex-row items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{order.listingTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.method === "wallet" ? "Wallet" : "Transfer"} ·{" "}
                          {timeAgo(order.createdAt)}
                        </p>
                      </div>
                      <StatusPill status={order.status} />
                      <span className="text-sm font-semibold tabular-nums">
                        {naira(order.payableKobo)}
                      </span>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="sold" className="mt-4">
          {sold.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-sm text-muted-foreground">
                No sales yet.{" "}
                <Link href="/sell" className="font-medium text-primary hover:underline">
                  Add a dish
                </Link>
                .
              </p>
            </Card>
          ) : (
            <ul className="space-y-2.5">
              {sold.map((sale) => (
                <li key={sale.id}>
                  <Card className="flex flex-row items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{sale.listingTitle}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(sale.createdAt)}</p>
                    </div>
                    <StatusPill status={sale.status} />
                    <span className="text-sm font-semibold text-success tabular-nums">
                      +{naira(sale.amountKobo)}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
