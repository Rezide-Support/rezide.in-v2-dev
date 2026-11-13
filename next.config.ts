import type { NextConfig } from "next";

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
