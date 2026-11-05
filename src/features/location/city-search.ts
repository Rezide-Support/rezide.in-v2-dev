/**
 * Cities matching the query anywhere in the name, with exact and then prefix
 * matches first ("pu" puts Pune above Jaipur), as rezide.in's city picker ranks them.
 */
export function rankCities(cities: readonly string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [...cities];
  const score = (c: string) => {
    const name = c.toLowerCase();
    return name === q ? 0 : name.startsWith(q) ? 1 : 2;
  };
  return cities.filter((c) => c.toLowerCase().includes(q)).sort((a, b) => score(a) - score(b));
}
