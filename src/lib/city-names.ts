/*
 * How city names from the backend's city master are shown. Kept free of app imports so the
 * SEO URL helpers (and src/proxy.ts) can use it; src/services/locations.ts re-exports it.
 */

/**
 * Cities the backend's city master spells differently from how we show them,
 * keyed by the master's name (as rezide.in shows "Bangalore" as Bengaluru).
 */
export const CITY_DISPLAY_NAMES: Record<string, string> = { Bangalore: "Bengaluru" };

/** How a city master name is shown: Bangalore → Bengaluru. Shown names stay as they are. */
export const cityLabel = (name: string) => CITY_DISPLAY_NAMES[name] ?? name;
