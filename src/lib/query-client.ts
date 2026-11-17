import { QueryClient } from "@tanstack/react-query";

let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** One client per server render; one shared client in the browser. */
export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

/** Cancel pending private reads before removing their cached data. */
export function clearPrivateQueries() {
  if (typeof window === "undefined") return;
  const client = getQueryClient();
  for (const domain of ["account", "dashboard"]) {
    void client.cancelQueries({ queryKey: [domain] });
    client.removeQueries({ queryKey: [domain] });
  }
  client.getMutationCache().clear();
}