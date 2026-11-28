import { NextResponse, type NextRequest } from "next/server";
import { API_SERVER_BASE_URL } from "@/lib/api/origins";
import { developerPath, developerRecordSlug, type DeveloperSlugRecord } from "@/lib/developer-url";
import { localityPath, localityRowSlug, type LocalitySlugRow } from "@/lib/locality-url";
import { projectPath } from "@/lib/project-url";

/*
 * Old links with a bare backend id → a permanent (308) redirect to the page's SEO URL, so search
 * engines move the old URL's ranking to the new one:
 *   /projects/<id> → /projects/<name>-…-<city>-<id>                 (src/lib/project-url.ts)
 *   /locality/<id> → /locality/<locality>-<sub-region>-<city>-<id>   (src/lib/locality-url.ts)
 *   /developers/<id> → /developers/<name>-<city>-<id>                 (src/lib/developer-url.ts)
 *
 * This runs here, before the page, because the pages stream: a redirect() there only sends a
 * <meta> refresh, not an HTTP status. Only bare-id URLs reach this (see `config.matcher`), and the
 * words always come from the same data the page's canonical URL uses. If the lookup fails or
 * finds nothing, the request carries on and the page loads (or 404s) by id.
 */

const LOOKUP_TIMEOUT_MS = 10_000;

const getJson = async <T,>(url: string | URL, body?: unknown): Promise<T | undefined> => {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  });
  return response.ok ? ((await response.json()) as T) : undefined;
};

/**
 * A project's slug from this app's own GET /api/projects?ids=<id>: the same server code (and city
 * index) that gives every card its link.
 */
async function projectSeoPath(id: string, origin: string): Promise<string | undefined> {
  const body = await getJson<{ items?: { id?: string; slug?: string }[] }>(new URL(`/api/projects?ids=${encodeURIComponent(id)}`, origin));
  const slug = body?.items?.find((p) => p.id === id)?.slug;
  return slug ? projectPath({ id, slug }) : undefined;
}

/** A locality's slug from its list row (found by the name its record gives), as the page makes it. */
async function localitySeoPath(id: string): Promise<string | undefined> {
  const record = await getJson<{ general_information?: { locality_name?: string } }>(`${API_SERVER_BASE_URL}/Repository/Locality/${encodeURIComponent(id)}`);
  const name = record?.general_information?.locality_name?.trim();
  if (!name) return undefined;
  const list = await getJson<{ data?: (LocalitySlugRow & { _id?: string })[] }>(`${API_SERVER_BASE_URL}/Repository/Locality/filter?page=1&pageSize=50`, {
    sub_regions: null,
    regions: null,
    searchQuery: [name],
  });
  const row = list?.data?.find((r) => String(r._id) === id);
  const slug = row ? localityRowSlug(row) : "";
  return slug ? localityPath({ id, slug }) : undefined;
}

/**
 * A developer's slug from its record: name and first office city, as the page makes it. (The
 * record also holds bank details; only those two fields are read.)
 */
async function developerSeoPath(id: string): Promise<string | undefined> {
  const body = await getJson<DeveloperSlugRecord & { data?: DeveloperSlugRecord }>(`${API_SERVER_BASE_URL}/repository/developer/${encodeURIComponent(id)}`);
  const record = body?.general_information ? body : body?.data;
  if (!record?.general_information?.developer_name?.trim()) return undefined;
  const slug = developerRecordSlug(record);
  return slug ? developerPath({ id, slug }) : undefined;
}

export async function proxy(request: NextRequest) {
  const [, section, id] = request.nextUrl.pathname.split("/");
  try {
    const path =
      section === "projects" ? await projectSeoPath(id, request.nextUrl.origin) : section === "locality" ? await localitySeoPath(id) : await developerSeoPath(id);
    if (!path || path === request.nextUrl.pathname) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = path;
    return NextResponse.redirect(url, 308);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  // Exactly /projects/<24-hex id>, /locality/<24-hex id> and /developers/<24-hex id>: never
  // /projects/search, the status tabs or SEO URLs.
  matcher: ["/projects/:id([a-fA-F0-9]{24})", "/locality/:id([a-fA-F0-9]{24})", "/developers/:id([a-fA-F0-9]{24})"],
};
