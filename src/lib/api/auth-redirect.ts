/**
 * Where a 401 sends the user: the sign-in page with `next` set to the page they
 * were on (realtor sign-in for /dashboard). Returns null on the auth pages
 * themselves so a 401 there can't loop.
 */
export function signInPathFor(pathname: string, search = ""): string | null {
  if (pathname === "/login" || pathname === "/signup") return null;
  const next = encodeURIComponent(`${pathname}${search}`);
  return pathname.startsWith("/dashboard") ? `/login?role=realtor&next=${next}` : `/login?next=${next}`;
}
