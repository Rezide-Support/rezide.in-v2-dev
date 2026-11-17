import { ProxyError } from "./proxy-error";
export { ProxyError } from "./proxy-error";
import { apiOrigin as origin } from "@/lib/api/origins";
import "server-only";
import { record, text } from "@/features/realtors/directory-model";


const isTimeout = (error: unknown) => ["TimeoutError", "AbortError"].includes(text(record(error).name));


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
    throw new ProxyError(response.ok ? "The realtor service returned an invalid response." : "The service is unavailable. Please retry.", 502);
  }
  if (!response.ok) {
    console.error("Rezide upstream rejected request", { path, status: response.status });
    throw new ProxyError(response.status === 404 ? "The requested resource was not found." : "The service is unavailable. Please retry.", response.status === 404 ? 404 : 502);
  }
  if (result === null || typeof result !== "object") throw new ProxyError("The realtor service returned an invalid response.", 502);
  return result;
}

