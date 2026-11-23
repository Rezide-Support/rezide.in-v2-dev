/**
 * Sample photography used by the prototype (Unsplash). Replace with listing
 * media from the production CDN when the media service is connected.
 */
/**
 * Unsplash URL for a photo id. `ref` (optional) makes the URL unique to one
 * listing: the sample data reuses a small photo pool, and identical URLs on
 * eager and lazy cards confuse Next's LCP check. Unsplash ignores the parameter.
 */
export const unsplash = (id: string, width = 1200, ref?: string) =>
  `https://images.unsplash.com/${id}?fm=jpg&q=70&w=${width}&auto=format&fit=crop${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;

/**
 * Same image at a smaller source width, for thumbnails. Keeps thumbnails from
 * downloading the full-size photo, and gives them their own URL so Next's LCP
 * check doesn't mistake a lazy thumbnail for the eager main photo. URLs without
 * a `w` parameter are returned unchanged.
 */
export function thumbnailSrc(src: string, width = 480) {
  try {
    const url = new URL(src);
    if (!url.searchParams.has("w")) return src;
    url.searchParams.set("w", String(width));
    return url.toString();
  } catch {
    return src;
  }
}

export const PHOTO_IDS = {
  homes: [
    "photo-1600607687939-ce8a6c25118c",
    "photo-1600210492486-724fe5c67fb0",
    "photo-1586023492125-27b2c045efd7",
    "photo-1502672260266-1c1ef2d93688",
    "photo-1493809842364-78817add7ffb",
    "photo-1600566753190-17f0baa2a6c3",
    "photo-1484154218962-a197022b5858",
    "photo-1512917774080-9991f1c4c750",
  ],
  offices: [
    "photo-1497366216548-37526070297c",
    "photo-1497366811353-6870744d04b2",
    "photo-1524758631624-e2822e304c36",
    "photo-1497215842964-222b430dc094",
    "photo-1556761175-b413da4baf72",
    "photo-1604328698692-f76ea9498e76",
  ],
  retail: [
    "photo-1441986300917-64674bd600d8",
    "photo-1567401893414-76b7b1e5a7a5",
    "photo-1555529669-e69e7aa0ba9a",
    "photo-1604719312566-8912e9227c6a",
    "photo-1528698827591-e19ccd7bc23d",
    "photo-1534452203293-494d7ddbf7e0",
  ],
  industrial: [
    "photo-1586528116311-ad8dd3c8310d",
    "photo-1553413077-190dd305871c",
    "photo-1565793298595-6a879b1d9492",
    "photo-1581091226825-a6a2a5aee158",
    "photo-1587293852726-70cdb56c2866",
    "photo-1504917595217-d4dc5ebe6122",
  ],
  land: [
    "photo-1500382017468-9049fed747ef",
    "photo-1500076656116-558758c991c1",
    "photo-1416879595882-3373a0480b5b",
    "photo-1523348837708-15d4a09cfac2",
    "photo-1501785888041-af3ef285b470",
  ],
  projects: [
    "photo-1545324418-cc1a3fa10c00",
    "photo-1512917774080-9991f1c4c750",
    "photo-1600585154340-be6161a56a0c",
    "photo-1560448204-e02f11c3d0e2",
    "photo-1574362848149-11496d93a7c7",
    "photo-1486406146926-c627a92ad1ab",
  ],
  people: [
    "photo-1573497019940-1c28c88b4f3e",
    "photo-1560250097-0b93528c311a",
    "photo-1600878459138-e1123b37cb30",
    "photo-1573496359142-b8d87734a5a2",
    "photo-1642257859842-c95f9fa8121d",
    "photo-1585240975858-7264fd020798",
    "photo-1588178454780-441fa5b99fa5",
    "photo-1685760259914-ee8d2c92d2e0",
  ],
} as const;

export type HeroKey =
  | "homes"
  | "offices"
  | "retail"
  | "industrial"
  | "land"
  | "uc"
  | "rtm"
  | "nl"
  | "realtor"
  | "corner";

/** Hero photography with the credits shown in the prototype. */
export const HERO_IMAGES: Record<HeroKey, { src: string; credit: string; href: string }> = {
  homes: { src: unsplash("photo-1758448755856-01d3add0177b", 2400), credit: "Aalo Lens", href: "https://unsplash.com/@aalolens" },
  offices: { src: "/images/property/office-hero.png", credit: "", href: "" },
  retail: { src: "/images/property/retail-hero.png", credit: "", href: "" },
  industrial: { src: "/images/property/industrial-hero.png", credit: "", href: "" },
  land: { src: "/images/property/land-hero.png", credit: "", href: "" },
  uc: { src: unsplash("photo-1786618315979-2dbbfd3b38a7", 2400), credit: "Timur Seyfelmlyukov", href: "https://unsplash.com/@timurse" },
  rtm: { src: unsplash("photo-1759845565036-cbecbcfcb8e2", 2400), credit: "Joachim Lesne", href: "https://unsplash.com/@joaching" },
  nl: { src: unsplash("photo-1751054770504-c69daeec4721", 2400), credit: "John Kakuk", href: "https://unsplash.com/@lensatic" },
  realtor: { src: unsplash("photo-1647580427155-0483906cb9de", 2400), credit: "Eric Ardito", href: "https://unsplash.com/@ericardito" },
  corner: { src: unsplash("photo-1560250097-0b93528c311a", 2400), credit: "LinkedIn Sales Solutions", href: "https://unsplash.com/@linkedinsalesnavigator" },
};
