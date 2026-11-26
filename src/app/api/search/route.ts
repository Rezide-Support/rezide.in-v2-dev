import { searchRoute } from "@/lib/api/realtor-proxy";
import { fetchSearchSuggestions } from "@/services/locations";
import { guardSearch } from "@/lib/api/search-guard";
import { ProxyError } from "@/lib/api/proxy-error";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.get("scope") !== "all") return searchRoute(request);
  try {
    guardSearch(request);
    const q = (params.get("q") ?? "").trim();
    const city = (params.get("city") ?? "").trim();
    if (q.length > 200 || city.length > 100) return Response.json({ message: "Invalid search." }, { status: 400 });
    const suggestions = await fetchSearchSuggestions(q, { city, scope: "all" });
    return Response.json({ result: suggestions.map(s => ({ id: s.id, name: s.name, source: s.kind === "subRegion" ? "sub region" : s.kind, city: s.city })) });
  } catch (error) {
    return Response.json({ message: "Couldn't load search suggestions." }, { status: error instanceof ProxyError ? error.status : 502 });
  }
}
