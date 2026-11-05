"use client";

import { useQuery } from "@tanstack/react-query";
import { locationQueries } from "@/lib/queries";

/**
 * The List Property location picker's options, from the backend's tree: each
 * level loads once the one above is chosen, as in rezide.in's search bar. The
 * draft keeps names, so the chosen name is looked up to find its id. A level that
 * has nothing yet (many cities have no regions) leaves its list empty, and the
 * locality can still be typed.
 */
export function useLocationOptions(city: string, region: string | undefined, subRegion: string | undefined) {
  const cityId = useQuery(locationQueries.cityId(city)).data ?? "";
  const regions = useQuery({ ...locationQueries.regions(cityId), enabled: !!cityId }).data ?? [];

  const regionId = regions.find((r) => r.name === region)?.id ?? "";
  const subRegions = useQuery({ ...locationQueries.subRegions(regionId), enabled: !!regionId }).data ?? [];

  const subRegionId = subRegions.find((s) => s.name === subRegion)?.id ?? "";
  const localities = useQuery({ ...locationQueries.localities(subRegionId), enabled: !!subRegionId }).data ?? [];

  const names = (places: { name: string }[]) => places.map((p) => p.name);
  return { regions: names(regions), subRegions: names(subRegions), localities: names(localities) };
}
