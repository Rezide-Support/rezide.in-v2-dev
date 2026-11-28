import type { Property } from "@/types/models";

type UrlProperty = Pick<Property, "id"> &
  Partial<
    Pick<
      Property,
      | "title"
      | "unitType"
      | "intent"
      | "locality"
      | "city"
      | "areaSqft"
      | "areaKnown"
    >
  >;

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Keep the immutable ID as the lookup key; descriptive words are for readers. */
export function propertyHref(property: UrlProperty): string {
  const name = slugify(property.title || property.unitType || "");
  if (!name) return `/properties/${encodeURIComponent(property.id)}`;
  const location = [
    ...new Set(
      [property.locality, property.city]
        .filter(Boolean)
        .map((value) => slugify(value!)),
    ),
  ]
    .filter(Boolean)
    .join("-");
  const purpose =
    property.intent === "rent"
      ? "for-rent"
      : property.intent === "buy"
        ? "for-sale"
        : "";
  const area =
    property.areaKnown !== false &&
    property.areaSqft &&
    Number.isFinite(property.areaSqft) &&
    property.areaSqft > 0
      ? `${property.areaSqft}-sqft`
      : "";
  const slug = [name, purpose, location ? `in-${location}` : "", area]
    .filter(Boolean)
    .join("-");
  return `/properties/${slug}-pid-${encodeURIComponent(property.id)}`;
}

export function propertyIdFromSegment(segment: string): string {
  return segment.includes("-pid-")
    ? segment.slice(segment.lastIndexOf("-pid-") + 5)
    : segment;
}
