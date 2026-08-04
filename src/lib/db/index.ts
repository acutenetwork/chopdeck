import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

/**
 * Turso (libSQL) — the same engine locally and in production, so there is no
 * dev/prod database difference. Cached on `globalThis` so Next's dev server does
 * not open a new connection on every hot reload.
 */
const globalForDb = globalThis as unknown as {
  chopdeckDb?: ReturnType<typeof drizzle<typeof schema>>;
};

const CONNECT_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;

/**
 * The database is remote, so a request can lose a TCP connect to a transient
 * network blip. Retry those with a short backoff: a dropped connection means the
 * query never ran, so replaying it is safe. Anything the server actually answered
 * (including an error response) is returned as-is and never retried.
 */
const retryingFetch: typeof fetch = async (input, init) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // A Request's body can only be read once, so each attempt needs its own copy.
      const target = input instanceof Request ? input.clone() : input;
      return await fetch(target, { ...init, signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS) });
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
  }

  throw lastError;
};

function createDb() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_DATABASE_SECRET;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set.");

  return drizzle(createClient({ url, authToken, fetch: retryingFetch }), { schema });
}

export const db = globalForDb.chopdeckDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.chopdeckDb = db;

export { schema };
