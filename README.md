# Chopdeck — a food marketplace on Acute

A real, deployable food marketplace. Anyone who signs up can **buy** food or **sell**
it, and everyone gets an **Acute wallet** the moment they register. Buyers top up and
pay in one tap, or pay by bank transfer. Sellers get paid straight into their own
wallet and cash out to their bank.

There is no internal admin dashboard, by design: the platform operator watches every
payment, wallet and webhook in the **Acute console**.

It talks to Acute over plain HTTP only — no SDK, no private packages — so every call
here is one you can make yourself with `curl`. That is the point: it is a worked
example of building a real marketplace on the API, not a toy.

> "Chopdeck" is a working title — check it is clear before you ship under it.

## What each Acute feature does here

| Feature | Endpoint | Where it shows up |
|---|---|---|
| Wallet per user | `POST /v1/wallets` | Created during signup — no user exists without somewhere to hold money |
| Wallet verification | `POST /v1/wallets/:id/kyc` | "Verify wallet" — unlocks the balance and cash-out |
| Balance | `GET /v1/wallets/:id/balance` | The wallet screen and the checkout modal |
| Top up | `POST /v1/payments` (`bank_transfer`, target = own wallet) | "Add money" → a one-time account to transfer into |
| Pay from wallet | `POST /v1/payments` (`virtual_wallet`) + `POST /v1/wallets/:id/pay` | "Pay from wallet" — instant, debits buyer, credits seller |
| Pay by transfer | `POST /v1/payments` (`bank_transfer`, target = seller wallet) | "Pay with bank transfer" → account number → live order page |
| Cash out | `POST /v1/wallets/:id/withdraw` | "Cash out" on the wallet screen |
| Webhooks | signed receiver at `/api/webhooks/acute` | `payment.settled/expired/refunded`, `withdrawal.completed/failed` drive every status |

Money is always integer **kobo**. Every money-moving call carries an
**Idempotency-Key**. Every webhook is **signature-verified** and **deduped on the
event id**. Revenue settles directly into the seller's wallet — it never passes
through a platform account.

## Screens

- `/` browse food · `/food/[id]` a dish + the pay modal
- `/orders` what I bought and sold · `/orders/[reference]` a live order
- `/sell` my kitchen: add dishes, mark them sold out
- `/wallet` balance, verify, add money, cash out

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Drizzle ORM ·
**Turso (libSQL)** — the same database engine locally and in production, so there is
no dev/prod difference. Auth is email + password (scrypt) with a database-backed
session cookie. Reads are server components; mutations are server actions; the
webhook receiver is a raw-body route handler.

The Acute client lives in `src/lib/acute` and talks to the public HTTP API only —
no internal packages, exactly what an outside developer writes.

## Run it

You need the Acute API reachable and a sandbox key with a webhook endpoint pointed
at this app.

```bash
npm install
cp .env.example .env.local     # fill in the five values below
npm run db:generate            # generate the migration
npm run db:migrate             # apply it to your Turso database
npm run dev                    # http://localhost:3002
```

`.env.local`:

```
ACUTE_API_BASE=https://sandbox.api.acute.network   # live: https://api.acute.network
ACUTE_API_KEY=acuinf_sandbox_…                     # Acute console → Developers → API keys
ACUTE_WEBHOOK_SECRET=whsec_…                       # shown once when you register the webhook
TURSO_DATABASE_URL=libsql://…
TURSO_DATABASE_SECRET=…
```

Register `http://<this-app>/api/webhooks/acute` as your webhook URL in the Acute
console and paste the signing secret above.

Then: sign up, verify your wallet, add money, and buy something. In sandbox, trigger
the test settlement for a bank transfer from the Acute console ("Fund test payment")
— the app's code path is identical to production; only the money's origin differs.

## Deploy

`ACUTE_API_BASE` + `ACUTE_API_KEY` decide sandbox vs live, so going to production is
a URL and key swap with no code change. Turso is already a hosted database, so the
same connection string works from anywhere. Set the five environment variables,
register a production webhook, and you are live.
