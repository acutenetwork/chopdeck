import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify Acute's `X-Acute-Signature: t=<unix>,v1=<hmac>` over the RAW request body.
 * The signed string is `${timestamp}.${rawBody}`, so the body must never be parsed
 * and re-stringified before this runs. A timestamp outside the tolerance is
 * rejected, which is what stops a captured delivery being replayed later.
 */
export function verifyAcuteSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  if (!header || !secret) return false;

  const parts = Object.fromEntries(
    header.split(",").map((piece) => {
      const [key, ...rest] = piece.trim().split("=");
      return [key, rest.join("=")];
    }),
  ) as { t?: string; v1?: string };

  if (!parts.t || !parts.v1) return false;

  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts.v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface AcuteEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  createdAt: string;
  data: T;
}
