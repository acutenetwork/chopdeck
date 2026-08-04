import { randomUUID } from "node:crypto";

/**
 * The Acute merchant API client. Server-side only — the API key never reaches the
 * browser. Unwraps Acute's envelope and turns a failure into a typed `AcuteError`
 * carrying the granular `code`, which the UI branches on.
 */

const API_BASE = process.env.ACUTE_API_BASE;
const API_KEY = process.env.ACUTE_API_KEY;

interface ApiMeta {
  requestId: string;
}
interface ApiSuccess<T> {
  success: true;
  statusCode: number;
  data: T;
  meta: ApiMeta;
}
interface ApiPaginated<T> {
  success: true;
  statusCode: number;
  data: T[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
  meta: ApiMeta;
}
interface ApiFailure {
  success: false;
  statusCode: number;
  error: {
    type: string;
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: ApiMeta;
}

export class AcuteError extends Error {
  readonly code: string;
  readonly type: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;

  constructor(failure: ApiFailure) {
    super(failure.error.message);
    this.name = "AcuteError";
    this.code = failure.error.code;
    this.type = failure.error.type;
    this.status = failure.statusCode;
    this.details = failure.error.details;
    this.requestId = failure.meta?.requestId;
  }
}

/** A fresh key per money-moving call; pass an explicit one to make a retry safe. */
export function idem(): string {
  return randomUUID();
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Sent as `Idempotency-Key`; required by Acute on every money-moving POST. */
  idempotencyKey?: string;
  query?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_KEY) {
    throw new Error("ACUTE_API_KEY is not set — the app cannot reach the Acute API.");
  }
  if (!API_BASE) {
    throw new Error("ACUTE_API_BASE is not set — point it at your Acute environment.");
  }

  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json()) as ApiSuccess<T> | ApiPaginated<T> | ApiFailure;
  if (!payload.success) throw new AcuteError(payload);
  return payload.data as T;
}

export function acute<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>(path, options);
}

/** A cursor-paginated list: returns the rows plus the next cursor. */
export async function acuteList<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<{ data: T[]; nextCursor: string | null; hasMore: boolean }> {
  if (!API_KEY) throw new Error("ACUTE_API_KEY is not set.");
  if (!API_BASE) throw new Error("ACUTE_API_BASE is not set.");

  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
    cache: "no-store",
  });
  const payload = (await response.json()) as ApiPaginated<T> | ApiFailure;
  if (!payload.success) throw new AcuteError(payload);
  return {
    data: payload.data,
    nextCursor: payload.pagination.nextCursor,
    hasMore: payload.pagination.hasMore,
  };
}
