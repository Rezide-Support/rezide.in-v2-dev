import { describe, expect, it } from "vitest";
import { thumbnailSrc, unsplash } from "./media";

describe("thumbnailSrc", () => {
  it("requests a smaller width of the same photo", () => {
    const full = unsplash("photo-1545324418-cc1a3fa10c00", 1400);
    const thumb = thumbnailSrc(full);
    expect(thumb).not.toBe(full);
    expect(new URL(thumb).searchParams.get("w")).toBe("480");
    expect(new URL(thumb).pathname).toBe(new URL(full).pathname);
  });

  it("leaves URLs without a width parameter alone", () => {
    expect(thumbnailSrc("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(thumbnailSrc("/local.jpg")).toBe("/local.jpg");
  });
});
