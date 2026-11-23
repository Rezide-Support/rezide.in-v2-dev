import { useSyncExternalStore } from "react";

/**
 * Realtor Corner lives on its own site. Which one opens depends on where this app runs:
 * localhost, local network and Vercel deployments use the test link; everything else is production.
 */
export const REALTOR_CORNER_URLS = {
  test: "https://broker.development.rezide.in/",
  production: "https://broker.rezide.in/",
} as const;

/** localhost, 127.0.0.1, a phone on the local network (192.168.x.x ...) or a *.vercel.app deployment. */
export function isTestHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) ||
    hostname.endsWith(".vercel.app")
  );
}

export function getRealtorCornerUrl(hostname: string) {
  return isTestHost(hostname) ? REALTOR_CORNER_URLS.test : REALTOR_CORNER_URLS.production;
}

const subscribe = () => () => {};

/** The Realtor Corner link for this environment: production while rendering on the server, corrected right after load. */
export function useRealtorCornerUrl() {
  return useSyncExternalStore(subscribe, () => getRealtorCornerUrl(window.location.hostname), () => REALTOR_CORNER_URLS.production);
}