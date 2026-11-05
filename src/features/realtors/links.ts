import type { Firm, Realtor } from "@/types/models";

/* URL builders for realtor firm and agent pages (mirrors v1's /brokers/<firm>/<agent>). */

/** Firm page: /realtors/<firmSlug>. */
export const firmHref = (f: Pick<Firm, "id">) => `/realtors/${encodeURIComponent(f.id)}`;

/** Agent page: /realtors/<firmSlug>/<agentSlug>. */
export const realtorHref = (r: Pick<Realtor, "firmId" | "slug">) =>
  `/realtors/${encodeURIComponent(r.firmId)}/${encodeURIComponent(r.slug)}`;

/** Firm page of a realtor, from the realtor alone. */
export const realtorFirmHref = (r: Pick<Realtor, "firmId">) => firmHref({ id: r.firmId });

