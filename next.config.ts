import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy. Allows exactly the origins the app loads:
 * images from Unsplash, the Rezide CDN/backend, Google Maps and OpenStreetMap tiles; API
 * calls to the Rezide backend and the spatial-search service; everything else
 * from this origin. Google Maps (landmark map, directions iframe and place icons) as
 * rezide.in uses it. `'unsafe-inline'` is kept for scripts/styles because the
 * App Router injects inline hydration scripts and Tailwind/Leaflet inject inline
 * styles; a nonce-based policy is a future hardening. Dev adds `'unsafe-eval'`
 * and websockets for Turbopack HMR.
 */
const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `img-src 'self' data: blob: https://images.unsplash.com https://cdn.rezide.in https://api.rezide.in https://tile.openstreetmap.org https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com https://cdnjs.cloudflare.com`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' https://api.rezide.in https://si.rezide.in https://*.googleapis.com https://*.gstatic.com https://*.google.com${isDev ? " ws: wss:" : ""}`,
  `worker-src 'self' blob:`,
  `media-src 'self' https://cdn.rezide.in https://api.rezide.in`,
  // Preserve developer-hosted HTTPS tours as well as Google Maps and video embeds.
  `frame-src https:`,
  ...(isDev ? [] : [`upgrade-insecure-requests`]),
].join("; ");

/** Security headers applied to every response (security audit A-9). */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** Agent ids from before firm pages existed (`/realtors/<firm>-<agent>`). */
const LEGACY_AGENT_IDS = [
  ["assetpro", "rukmani-iyer"],
  ["vora", "dipesh-vora"],
  ["skyline", "arjun-mehta"],
  ["urbannest", "sana-qureshi"],
  ["keystone", "vikram-rao"],
  ["networth", "neha-kapoor"],
  ["landmark", "karan-malhotra"],
  ["crest", "priya-nair"],
] as const;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.29"],
  cacheComponents: true,
  partialPrefetching: true,
  // Don't advertise the framework (security audit A-9).
  poweredByHeader: false,
  // Security headers on every route (security audit A-9).
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Only for an environment that still sets NEXT_PUBLIC_API_BASE_URL=/v1/admin. The default calls the backend directly.
  async rewrites() {
    return [{ source: "/v1/admin/:path*", destination: "https://api.rezide.in/v1/admin/:path*" }];
  },
  // Canonical URLs for the discovery tabs (see src/lib/home-routes.ts).
  async redirects() {
    return [
      // The listings page used to live at /search; query strings carry over.
      { source: "/search", destination: "/properties", permanent: true },
      // Agent pages moved from /realtors/<firm>-<agent> to /realtors/<firm>/<agent> (v1's firm → agent hierarchy).
      ...LEGACY_AGENT_IDS.map(([firm, agent]) => ({
        source: `/realtors/${firm}-${agent}`,
        destination: `/realtors/${firm}/${agent}`,
        permanent: true,
      })),
      // The dashboard opens on Contacts. Redirecting here (not in a page) avoids rendering an empty segment.
      { source: "/dashboard", destination: "/dashboard/contacts", permanent: false },
      { source: "/homes", destination: "/", permanent: true },
      { source: "/project/:id", destination: "/projects/:id", permanent: true },
      { source: "/listing/:id", destination: "/properties/:id", permanent: true },
      { source: "/homes/lease", destination: "/homes/rent", permanent: true },
      { source: "/:category(offices|retail|industrial|land)/rent", destination: "/:category/lease", permanent: true },
    ];
  },
  images: {
    // Sample photography is served from Unsplash. Replace or extend this list
    // when listing media moves to the production CDN.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.rezide.in", pathname: "/v1/admin/file/upload/**" },
      // Listing and project photos from the Rezide backend.
      { protocol: "https", hostname: "cdn.rezide.in", pathname: "/images/**" },
    ],
    qualities: [70, 75],
    // Some networks (NAT64) resolve cdn.rezide.in to an address Next treats as private, and every photo answers 400.
    // Local development only: production keeps this SSRF protection.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
