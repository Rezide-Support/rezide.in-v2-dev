import "server-only";
import { isIP } from "node:net";
import { setBounded } from "@/lib/bounded-cache";
import { ProxyError } from "./rezide-upstream";

const WINDOW = 10 * 60_000;
const limits = new Map<string, { at: number; count: number }>();

/** Per-process limits. Trust IP headers only behind a proxy that overwrites them. */
export function guardLead(request: Request, now = Date.now()) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new ProxyError("This request is not allowed.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) throw new ProxyError("Send a JSON request.", 415);
  const forwarded = process.env.LEAD_TRUST_PROXY === "true" ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() : undefined;
  const ip = forwarded && isIP(forwarded) ? forwarded : "shared";
  for (const [key, max] of [["global", 100], [`ip:${ip}`, 5]] as const) {
    const hit = limits.get(key);
    const entry = hit && now - hit.at < WINDOW ? hit : { at: now, count: 0 };
    if (entry.count >= max) throw new ProxyError("Too many enquiries. Please try again later.", 429);
    setBounded(limits, key, { ...entry, count: entry.count + 1 }, 5000, WINDOW, now);
  }
}

export function checkLeadBot(input: Record<string, unknown>) {
  if (typeof input.website !== "undefined" && input.website !== "") throw new ProxyError("This request could not be accepted.", 422);
}
