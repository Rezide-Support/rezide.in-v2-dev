/**
 * The public site's address, for canonical URLs, Open Graph links, structured data and the sitemap.
 * Set NEXT_PUBLIC_SITE_URL for another environment (e.g. staging); defaults to the live site.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://rezide.in").replace(/\/+$/, "");

export const SITE_NAME = "Rezide";
