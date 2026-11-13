import "server-only";
import { record, text } from "@/features/realtors/directory-model";

const origin = () => (process.env.API_ORIGIN || "https://api.rezide.in").replace(/\/$/, "");
const isTimeout = (error: unknown) => ["TimeoutError", "AbortError"].includes(text(record(error).name));

export class ProxyError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function upstream(path: string, body?: unknown, ttl = 0, admin = true): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (admin && process.env.REQUEST_SERVICE_SECRET) headers["x-request-service-secret"] = process.env.REQUEST_SERVICE_SECRET;
  let response: Response;
  try {
    response = await fetch(`${origin()}${admin ? "/v1/admin" : "/v1"}${path}`, {
      method: body === undefined ? "GET" : "POST", headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15_000),
      ...(ttl ? { cache: "force-cache" as const, next: { revalidate: ttl } } : { cache: "no-store" as const }),
    });
  } catch (error) {
    const timeout = isTimeout(error);
    throw new ProxyError(timeout ? "The realtor service timed out. Please retry." : "The realtor service could not be reached.", timeout ? 504 : 502);
  }
  let result: unknown;
  try { result = await response.json(); } catch (error) {
    if (isTimeout(error)) throw new ProxyError("The realtor service timed out. Please retry.", 504);
    throw new ProxyError(response.ok ? "The realtor service returned an invalid response." : `The realtor service returned HTTP ${response.status}.`, response.ok ? 502 : response.status);
  }
  if (!response.ok) throw new ProxyError(text(record(result).message) || `The realtor service returned HTTP ${response.status}.`, response.status);
  if (result === null || typeof result !== "object") throw new ProxyError("The realtor service returned an invalid response.", 502);
  return result;
}

