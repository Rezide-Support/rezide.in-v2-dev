import { formatPrice } from "@/lib/format";
import type { Property } from "@/types/models";

/** Shared by server metadata and client cards; withheld prices remain hidden. */
export const priceLabel = (property: Property) =>
  property.priceHidden ? "Price on request" : formatPrice(property.price, { monthly: property.intent === "rent" });