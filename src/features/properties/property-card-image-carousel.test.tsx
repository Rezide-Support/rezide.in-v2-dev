import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PropertyCardImageCarousel } from "./property-card-image-carousel";
import { PropertyShareButton, propertyShareLinks, propertySharePhoto } from "./property-share";
import { toProperty } from "@/services/property-mapper";

const embla = vi.hoisted(() => {
  let selectedIndex = 0;
  const listeners = new Map<string, () => void>();
  const select = () => listeners.get("select")?.();
  return {
    viewportRef: vi.fn(),
    reset() {
      selectedIndex = 0;
      listeners.clear();
    },
    api: {
      selectedScrollSnap: vi.fn(() => selectedIndex),
      canScrollPrev: vi.fn(() => selectedIndex > 0),
      canScrollNext: vi.fn(() => selectedIndex < 4),
      on: vi.fn((event: string, callback: () => void) => {
        listeners.set(event, callback);
      }),
      off: vi.fn((event: string) => {
        listeners.delete(event);
      }),
      scrollPrev: vi.fn(() => {
        selectedIndex = Math.max(0, selectedIndex - 1);
        select();
      }),
      scrollNext: vi.fn(() => {
        selectedIndex = Math.min(4, selectedIndex + 1);
        select();
      }),
      scrollTo: vi.fn((index: number) => {
        selectedIndex = index;
        select();
      }),
    },
  };
});

vi.mock("embla-carousel-react", () => ({
  default: () => [embla.viewportRef, embla.api],
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, className, onError }: { src: string; alt: string; className?: string; onError?: () => void }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-src={src} className={className} onError={onError} />
  ),
}));

describe("PropertyCardImageCarousel", () => {
  beforeEach(() => {
    embla.reset();
    vi.clearAllMocks();
  });

  it("shows at most five linked photos and uses Embla for arrows and slide dots", async () => {
    const user = userEvent.setup();
    const images = Array.from({ length: 6 }, (_, index) => `https://cdn.rezide.in/images/photo-${index + 1}.jpeg`);
    render(<PropertyCardImageCarousel images={images} label="Apartment" href="/properties/listing-1" />);

    expect(screen.getAllByRole("group", { name: /^\d of 5$/ })).toHaveLength(5);
    expect(screen.getByRole("link", { name: "View Apartment, photo 1 of 5" })).toHaveAttribute("target", "_blank");
    expect(screen.queryByRole("button", { name: "Previous photo of Apartment" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next photo of Apartment" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next photo of Apartment" }));
    expect(embla.api.scrollNext).toHaveBeenCalledOnce();

    const thirdPhoto = screen.getByRole("button", { name: "Show photo 3 of Apartment" });
    await user.click(thirdPhoto);
    expect(embla.api.scrollTo).toHaveBeenCalledWith(2);
    expect(thirdPhoto).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Previous photo of Apartment" })).toBeInTheDocument();

    const nextPhoto = screen.getByRole("button", { name: "Next photo of Apartment" });
    await user.click(nextPhoto);
    await user.click(nextPhoto);
    expect(screen.queryByRole("button", { name: "Next photo of Apartment" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous photo of Apartment" })).toBeInTheDocument();
  });

  it("uses the empty-image fallback and omits controls for a single photo", () => {
    render(<PropertyCardImageCarousel images={[""]} label="Apartment" href="/properties/listing-1" />);

    expect(screen.getByRole("img", { name: "Apartment, photo 1 of 1" })).toHaveAttribute("data-src", "/images/empty.gif");
    expect(screen.queryByRole("button", { name: /photo of Apartment/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show photo/ })).not.toBeInTheDocument();
  });

  it("allows project previews to show the full gallery instead of the five-photo listing limit", () => {
    const images = Array.from({ length: 7 }, (_, i) => "/project-" + i + ".jpg");
    render(<PropertyCardImageCarousel images={images} maxImages={images.length} label="Project" href="/projects/project-1" />);
    expect(screen.getAllByRole("group", { name: /^\d of 7$/ })).toHaveLength(7);
    expect(screen.getByRole("button", { name: "Show photo 7 of Project" })).toBeInTheDocument();
  });
});

describe("property share preview", () => {
  const property = () => ({ ...toProperty({ _id: "67bd58fbc18ed7b482ddf422", listing_details: { listing_name: "A & B Apartment" } }), images: ["https://cdn.rezide.in/images/room.jpeg"], photoSource: "listing" as const, bhk: 3, price: 28000000, priceHidden: false });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it("shares loaded data without fetching details and resets Copied after five seconds", async () => {
    const user = userEvent.setup();
    const copy = vi.spyOn(navigator.clipboard, "writeText");
    const fetch = vi.spyOn(globalThis, "fetch");
    const p = property();
    render(<PropertyShareButton property={p} iconOnly />);
    await user.click(screen.getByRole("button", { name: `Share ${p.title}` }));
    expect(screen.getByRole("dialog", { name: "Share this property" })).toBeInTheDocument();
    expect(screen.getByText("3 BHK")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    const url = `${window.location.origin}/listing/${p.id}`;
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute("href", propertyShareLinks(p.title, url, false).email);
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", `https://web.whatsapp.com/send?text=${encodeURIComponent(url)}`);
    await user.click(screen.getByRole("button", { name: "Copy Link" }));
    expect(copy).toHaveBeenCalledWith(url);
    expect(screen.getByText("Copied!")).toBeInTheDocument();
    // A second copy restarts the same feedback timeout.
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Copied!" }));
    await act(async () => { await Promise.resolve(); });
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("Copy Link")).toBeInTheDocument();
  });

  it("preserves hidden prices and uses the GIF after an image fails", async () => {
    const user = userEvent.setup();
    const p = { ...property(), priceHidden: true };
    render(<PropertyShareButton property={p} iconOnly />);
    await user.click(screen.getByRole("button", { name: `Share ${p.title}` }));
    expect(screen.getByText(/Price On Request/)).toBeInTheDocument();
    expect(screen.queryByText(/2\.8/)).not.toBeInTheDocument();
    fireEvent.error(screen.getByRole("img", { name: p.title }));
    const fallback = screen.getByRole("img", { name: "Photo unavailable" });
    expect(fallback).toHaveAttribute("data-src", "/images/empty.gif");
    fireEvent.error(fallback);
    expect(fallback).toHaveAttribute("data-src", "/images/empty.gif");
  });

  it("uses a mobile sheet and mobile WhatsApp URL", async () => {
    const media = window.matchMedia;
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({ ...media(query), matches: query === "(max-width: 767px)" }));
    const user = userEvent.setup();
    const p = { ...property(), images: [] };
    render(<PropertyShareButton property={p} iconOnly />);
    await user.click(screen.getByRole("button", { name: `Share ${p.title}` }));
    expect(screen.getByRole("dialog", { name: "Share this property" })).toHaveAttribute("data-side", "bottom");
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", `https://wa.me/?text=${encodeURIComponent(`${window.location.origin}/listing/${p.id}`)}`);
    expect(screen.getByRole("img", { name: "Photo unavailable" })).toHaveAttribute("data-src", "/images/empty.gif");
  });

  it("encodes share links and resolves photo keys and absolute URLs", () => {
    expect(propertyShareLinks("A & B", "https://rezide.in/listing/x?a=1&b=2", false).email).toBe("mailto:?subject=Share%20Property%20-%20A%20%26%20B&body=https%3A%2F%2Frezide.in%2Flisting%2Fx%3Fa%3D1%26b%3D2");
    expect(propertySharePhoto("room 1")).toContain("/v1/admin/file/upload/room%201");
    expect(propertySharePhoto("https://cdn.rezide.in/room.jpeg")).toBe("https://cdn.rezide.in/room.jpeg");
    expect(propertySharePhoto()).toBe("/images/empty.gif");
  });
});
