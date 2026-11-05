import { CATEGORIES } from "@/lib/constants";
import type { Intent, ProjectStatus, PropertyCategory } from "@/types/models";

/**
 * URL scheme for the discovery home pages. Every hero tab is a real page so it
 * can be shared, bookmarked, indexed and restored with Back:
 *
 *   /                    Homes · Buy          /projects                 Under Construction
 *   /homes/rent          Homes · Rent         /projects/ready-to-move   Ready to Move
 *   /offices             Offices · Buy        /projects/new-launches    New Launches
 *   /offices/lease       Offices · Lease
 *   (retail, industrial and land follow the offices pattern)
 *
 * `/homes` redirects to `/`, and the wrong lease word (`/offices/rent`,
 * `/homes/lease`) redirects to the right one (see next.config.ts).
 */

/** Categories that have their own top-level path (homes lives at `/`). */
export const PATH_CATEGORIES = CATEGORIES.map((c) => c.id).filter(
  (c): c is Exclude<PropertyCategory, "homes"> => c !== "homes",
);

export const isPropertyCategory = (value: string): value is PropertyCategory =>
  CATEGORIES.some((c) => c.id === value);

/** Path segment for the rent/lease side of a category. */
export const leaseSlug = (category: PropertyCategory) => (category === "homes" ? "rent" : "lease");

export function propertiesHomeHref(category: PropertyCategory, intent: Intent): string {
  if (category === "homes") return intent === "buy" ? "/" : "/homes/rent";
  return intent === "buy" ? `/${category}` : `/${category}/${leaseSlug(category)}`;
}

/** Reads category and intent from a properties home path; `null` if it isn't one. */
export function parsePropertiesHomePath(pathname: string): { category: PropertyCategory; intent: Intent } | null {
  const [first, second, ...rest] = pathname.split("/").filter(Boolean);
  if (!first) return { category: "homes", intent: "buy" };
  if (rest.length || !isPropertyCategory(first)) return null;
  if (!second) return first === "homes" ? null : { category: first, intent: "buy" };
  return second === leaseSlug(first) ? { category: first, intent: "rent" } : null;
}

export const PROJECT_STATUS_SLUG: Record<ProjectStatus, string> = {
  uc: "",
  rtm: "ready-to-move",
  nl: "new-launches",
};

export const projectsHomeHref = (status: ProjectStatus) =>
  status === "uc" ? "/projects" : `/projects/${PROJECT_STATUS_SLUG[status]}`;

export function parseProjectsHomePath(pathname: string): ProjectStatus | null {
  const path = pathname.replace(/\/+$/, "");
  return (Object.keys(PROJECT_STATUS_SLUG) as ProjectStatus[]).find((s) => projectsHomeHref(s) === path) ?? null;
}
