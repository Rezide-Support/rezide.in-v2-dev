import { api } from "@/lib/api/client";
import { cdnImage } from "./property-mapper";

export type LocalityCardData = { id: string; name: string; images: string[]; rentalCount: number; saleCount: number };
export type LocalityDirectoryPage = { data: LocalityCardData[]; result_count: number };
export type LocalityDirectoryFilters = { regions: string[] | null; sub_regions: string[] | null; searchQuery: string[] | null; city?: string };
type LocalityRow = {
  _id?: string;
  general_information?: { locality_name?: string };
  media?: { images?: { url?: string }[] };
  total_listing_rental_count?: number | string | null;
  total_listing_sale_count?: number | string | null;
};

/** One filtered page; the records already contain everything the cards display. */
export async function searchLocalityDirectory(body: LocalityDirectoryFilters, page = 1, pageSize = 12): Promise<LocalityDirectoryPage> {
  const { data } = await api.post<{ data?: LocalityRow[]; result_count?: number | string }>("/Repository/Locality/filter", body, { params: { page, pageSize } });
  const count = (value: unknown) => Math.max(0, Number(value) || 0);
  return {
    data: (data.data ?? []).map(row => ({
      id: row._id ?? "", name: row.general_information?.locality_name?.trim() ?? "",
      images: (row.media?.images ?? []).slice(0, 5).flatMap(image => image.url?.trim() ? [cdnImage(image.url.trim())] : []),
      rentalCount: count(row.total_listing_rental_count), saleCount: count(row.total_listing_sale_count),
    })),
    result_count: count(data.result_count),
  };
}
