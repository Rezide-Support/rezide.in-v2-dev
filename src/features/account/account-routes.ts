export const SEEKER_ROUTES = { viewed: "/dashboard/my-searches/viewed", shared: "/dashboard/my-searches/recommended", shortlisted: "/dashboard/my-searches/shortlisted", visits: "/dashboard/my-searches/visits", offers: "/dashboard/my-searches/offers", rejected: "/dashboard/my-searches/rejected", profile: "/dashboard/profile", settings: "/dashboard/settings" } as const;
export const OWNER_ROUTES = { visits: "/dashboard/my-listings/my-visits", offers: "/dashboard/my-listings/my-offers", profile: "/dashboard/profile", settings: "/dashboard/settings" } as const;
export const isOwnerAccountPath = (path: string) => Object.values(OWNER_ROUTES).slice(0,2).some(value => value === path);
export const isCustomerDashboardPath = (path: string) => path.startsWith("/dashboard/my-searches/") || path.startsWith("/dashboard/my-listings/") || path === "/dashboard/settings" || path === "/dashboard/profile/form";
export const accountHref = (tab: string, owner = false) => (owner ? OWNER_ROUTES : SEEKER_ROUTES)[tab as keyof typeof OWNER_ROUTES] ?? SEEKER_ROUTES[tab as keyof typeof SEEKER_ROUTES] ?? SEEKER_ROUTES.viewed;
export function accountTabForPath(path: string) {
  if (path === "/dashboard/profile/form") return "profile";
  return Object.entries({ ...SEEKER_ROUTES, ...Object.fromEntries(Object.entries(OWNER_ROUTES).map(([key,value]) => [key + "-owner",value])) }).find(([,value]) => value === path)?.[0].replace("-owner", "");
}
