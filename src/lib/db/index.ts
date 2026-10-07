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

type Db = ReturnType<typeof createDb>;

/**
 * Created on first use, not on import. `next build` imports every route to
 * collect page data, so an eager client made the build itself need database
 * secrets (CI has none by design). A missing URL still fails loudly: on the
 * first query, at request time.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = (globalForDb.chopdeckDb ??= createDb());
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
