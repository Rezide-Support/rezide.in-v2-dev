import { AccountSidebar } from "@/features/account/account-sidebar";
import type { Session } from "@/types/models";
import { PropertyInfoTabs } from "./property-info-tabs";
import { toProperty } from "@/services/property-mapper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ListingLocality } from "./listing-locality";
import type { Property } from "@/types/models";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Building2, Images, LayoutGrid } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaGallery } from "./media-gallery";
import { MobileListingNav } from "./mobile-listing-nav";
import { useSessionStore } from "@/stores/session";
import { BackendAmenityTile } from "./amenity-list";

const push = vi.fn();
const navigation = vi.hoisted(() => ({ pathname: "/properties/test" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => navigation.pathname }));
const carousels = vi.hoisted(() => {
  const create = (options: { loop: boolean; align?: string }) => {
    const events = new Map<string, Set<() => void>>();
    let selected = 0;
    const api = {
      count: 0, options,
      selectedScrollSnap: () => selected,
      canScrollPrev: () => selected > 0,
      canScrollNext: () => selected < api.count - 1,
      on: vi.fn((event: string, callback: () => void) => { if (!events.has(event)) events.set(event, new Set()); events.get(event)!.add(callback); return api; }),
      off: vi.fn((event: string, callback: () => void) => { events.get(event)?.delete(callback); return api; }),
      scrollTo: vi.fn((index: number) => { selected = Math.max(0, Math.min(index, api.count - 1)); events.get("select")?.forEach(callback => callback()); }),
      scrollPrev: vi.fn(() => api.scrollTo(selected - 1)),
      scrollNext: vi.fn(() => api.scrollTo(selected + 1)),
    };
    return api;
  };
  return { create, main: [] as ReturnType<typeof create>[], thumbs: [] as ReturnType<typeof create>[] };
});
vi.mock("embla-carousel-react", async () => {
  const { useState, useCallback } = await import("react");
  return { default: function useMockEmbla(options: { loop: boolean; align?: string }) {
    const [api] = useState(() => { const api = carousels.create(options); (options.align ? carousels.thumbs : carousels.main).push(api); return api; });
    const ref = useCallback((node: HTMLElement | null) => { if (node) api.count = node.firstElementChild?.children.length ?? 0; }, [api]);
    return [ref, api];
  } };
});
beforeEach(() => { carousels.main.length = 0; carousels.thumbs.length = 0; });
afterEach(() => { vi.restoreAllMocks(); useSessionStore.setState({ session: null }); push.mockReset(); });

it("uses the original amenity filename and retains its label after an icon request fails", () => {
  const { container } = render(<BackendAmenityTile name="Gas Leak Detector" />);
  const icon = container.querySelector("img")!;
  expect(icon).toHaveAttribute("src", "https://api.rezide.in/v1/admin/repository/amenities/icon/Gas%20Leak%20Detector.svg");
  expect(icon).toHaveAttribute("width", "32");
  expect(icon).toHaveAttribute("height", "32");
  fireEvent.error(icon);
  expect(icon).toHaveAttribute("src", "/images/amenity-fallback.svg");
  fireEvent.error(icon);
  expect(icon).toHaveAttribute("src", "/images/amenity-fallback.svg");
  expect(screen.getByText("Gas Leak Detector")).toBeInTheDocument();
});

describe("MediaGallery photo labels", () => {
  it("keeps captions and the counter aligned after a swipe and thumbnail selection", async () => {
    const user = userEvent.setup();
    render(<MediaGallery title="Apartment" overlay={<button>Shortlist</button>} tabs={[{ value: "photos", label: "Photos", icon: Images, images: [], slides: [{ url: "/kitchen.jpg", label: "Kitchen" }, { url: "/bedroom.jpg", label: "Bedroom" }], empty: "" }, { value: "plans", label: "Plans", icon: LayoutGrid, images: [], empty: "" }]} />);
    expect(screen.queryByRole("tab", { name: "Plans" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Shortlist" })).toBeInTheDocument();
    const gallery = screen.getByRole("region", { name: "Apartment: photos" });
    expect(within(gallery).getByRole("button", { name: "Previous slide" })).toBeDisabled();
    expect(within(gallery).getByRole("button", { name: "Next slide" })).toBeEnabled();
    act(() => carousels.main[0].scrollTo(1));
    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(within(gallery).getByRole("button", { name: "Next slide" })).toBeDisabled();
    expect(within(gallery).getByRole("button", { name: "Previous slide" })).toBeEnabled();
    fireEvent.keyDown(gallery, { key: "ArrowRight" });
    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "2 of 2" })).toHaveTextContent("Bedroom");
    await user.click(screen.getByRole("button", { name: "Show photo 1 of 2" }));
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(within(gallery).getByRole("button", { name: "Previous slide" })).toBeDisabled();
    expect(screen.getByRole("group", { name: "1 of 2" })).toHaveTextContent("Kitchen");
  });
  it("scrolls thumbnails independently, synchronizes selection, and removes listeners", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<MediaGallery title="Apartment" tabs={[{ value: "photos", label: "Photos", icon: Images, images: Array.from({ length: 6 }, (_, i) => "/photo-" + i + ".jpg"), empty: "" }]} />);
    const main = carousels.main[0];
    const thumb = carousels.thumbs[0];
    const strip = screen.getByRole("region", { name: "Apartment: photos thumbnails" });
    expect(strip).toHaveClass("max-lg:hidden");
    expect(main.options).toEqual({ loop: false });
    expect(thumb.options).toEqual({ loop: false, align: "start", containScroll: "keepSnaps" });
    await user.click(within(strip).getByRole("button", { name: "Next slide" }));
    expect(main.selectedScrollSnap()).toBe(0);
    expect(thumb.scrollNext).toHaveBeenCalled();
    expect(screen.getByText("1/6")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show photo 4 of 6" }));
    expect(main.scrollTo).toHaveBeenCalledWith(3);
    expect(thumb.scrollTo).toHaveBeenLastCalledWith(3);
    expect(screen.getByText("4/6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show photo 4 of 6" })).toHaveAttribute("aria-current", "true");
    fireEvent.keyDown(strip, { key: "ArrowRight" });
    expect(thumb.selectedScrollSnap()).toBe(4);
    expect(main.selectedScrollSnap()).toBe(3);
    unmount();
    expect(main.off).toHaveBeenCalledWith("select", expect.any(Function));
    expect(thumb.off).toHaveBeenCalledWith("reInit", expect.any(Function));
  });
  it("shows each tab's photo labels when switching galleries", async () => {
    const user = userEvent.setup();
    render(
      <MediaGallery
        title="Apartment"
        tabs={[
          {
            value: "photos",
            label: "Photos",
            icon: Images,
            images: [],
            slides: [{ url: "/photo.jpg", label: "Living Room" }],
            empty: "",
          },
          {
            value: "complex",
            label: "Complex",
            icon: Building2,
            images: ["/exterior.jpg"],
            slides: [{ url: "/exterior.jpg", label: "Exterior" }],
            empty: "",
          },
          {
            value: "plans",
            label: "Plans",
            icon: LayoutGrid,
            images: ["/plan.jpg"],
            slides: [{ url: "/plan.jpg", label: "Unit Plan" }],
            empty: "",
          },
        ]}
      />,
    );

    expect(screen.getByText("Living Room")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Complex" }));
    expect(screen.getByText("Exterior")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Plans" }));
    expect(screen.getByText("Unit Plan")).toBeVisible();
  });

  it("falls back to the image list when a tab has no labeled slides", () => {
    render(
      <MediaGallery
        title="Apartment"
        tabs={[
          {
            value: "complex",
            label: "Complex",
            icon: Building2,
            images: ["/exterior.jpg"],
            slides: [],
            empty: "",
          },
        ]}
      />,
    );

    expect(screen.getByRole("region", { name: "Apartment: complex" })).toBeInTheDocument();
  });
});

describe("mobile listing navigation", () => {
  const renderNav = () => {
    vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) { return (this.id ? [{}] : []) as unknown as DOMRectList; });
    Element.prototype.scrollTo = vi.fn();
    return render(<div data-listing-detail><section id="overview">Overview content</section><section id="property">Property content</section><section id="recent">Transaction content</section><section id="compare">Comparison content</section><MobileListingNav /></div>);
  };
  it("hides guest-only restricted and absent sections, and opens sign-in for account and compare", async () => {
    useSessionStore.setState({ session: null });
    const user = userEvent.setup();
    renderNav();
    const strip = screen.getByRole("navigation", { name: "Listing sections" });
    await waitFor(() => expect(within(strip).getByRole("button", { name: "Property" })).toBeInTheDocument());
    expect(within(strip).queryByRole("button", { name: "Transactions" })).not.toBeInTheDocument();
    expect(within(strip).queryByRole("button", { name: "Compare apartments" })).not.toBeInTheDocument();
    expect(within(strip).queryByRole("button", { name: "Dimensions" })).not.toBeInTheDocument();
    const icons = screen.getByRole("navigation", { name: "Mobile navigation" });
    await user.click(within(icons).getByRole("button", { name: "Compare" }));
    await user.click(within(icons).getByRole("button", { name: "Account" }));
    expect(push).toHaveBeenCalledTimes(2);
    expect(push.mock.calls[0][0]).toContain("modal=signIn");
  });
  it("shows authenticated sections and opens an account sheet above the bottom navigation", async () => {
    useSessionStore.getState().signIn({ user: { id: "u1", role: "seeker", firstName: "Asha", lastName: "Rao", phone: "9820012345" }, expiresAt: new Date(Date.now() + 60_000).toISOString() });
    const user = userEvent.setup();
    renderNav();
    const strip = screen.getByRole("navigation", { name: "Listing sections" });
    await waitFor(() => expect(within(strip).getByRole("button", { name: "Transactions" })).toBeInTheDocument());
    expect(within(strip).getByRole("button", { name: "Compare apartments" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("navigation", { name: "Mobile navigation" })).getByRole("button", { name: "Account" }));
    expect(screen.getByRole("dialog", { name: "Your account" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Viewed properties" })).toHaveAttribute("href", "/dashboard/my-searches/viewed");
  });
  it("scrolls below the header and updates the active section as the page scrolls", async () => {
    useSessionStore.setState({ session: null });
    const user = userEvent.setup();
    renderNav();
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    let propertyTop = 1000;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      return { top: this.id === "property" ? propertyTop : -100, bottom: 0, height: 100, width: 100, left: 0, right: 100, x: 0, y: 0, toJSON() {} };
    });
    const strip = screen.getByRole("navigation", { name: "Listing sections" });
    const property = await within(strip).findByRole("button", { name: "Property" });
    await user.click(property);
    expect(scroll).toHaveBeenCalledWith({ top: 928, behavior: "smooth" });
    propertyTop = 40;
    fireEvent.scroll(window);
    await waitFor(() => expect(property).toHaveAttribute("aria-current", "location"));
  });
});

vi.mock("./locality-map", () => ({ LocalityMap: () => <div data-testid="marker-map">Marker map</div> }));

describe("Listing locality", () => {
 const property = {projectId:"67f0e8445817e6ef8d80f822",projectLocality:{name:"Lalbaug",coords:[19.12,72.91]}} as Property;
 it("toggles row directions, clears selection on category change, and preserves backend distances", async () => {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");
  const request = vi.spyOn(globalThis,"fetch").mockImplementation(async input => {
   const url = String(input);
   return {ok:true,json:async () => url.includes("landmarks") ? [{_id:"one",placeName:url.includes("hospital") ? "Hospital" : "School",latitude:19.2,longitude:72.8,distance:1.419,icon:"https://maps.gstatic.com/icon.png"}] : {id:"locality-id",image:"/images/empty.gif"}} as Response;
  });
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
  const view = render(<QueryClientProvider client={client}><ListingLocality property={property}/></QueryClientProvider>);
  expect(await screen.findByText("1.42 kms")).toBeInTheDocument();
  expect(screen.getByRole("link",{name:"Explore Lalbaug"})).toHaveAttribute("href","/locality/locality-id");
  fireEvent.click(screen.getByRole("button",{name:/School.*1\.42/}));
  expect(screen.queryByTestId("marker-map")).not.toBeInTheDocument();
  expect(screen.getByTitle("Driving directions to School")).toHaveAttribute("src",expect.stringContaining("origin=19.12%2C72.91"));
  fireEvent.click(screen.getByRole("button",{name:/School.*1\.42/}));
  expect(screen.getByTestId("marker-map")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:/School.*1\.42/}));
  fireEvent.click(screen.getByRole("button",{name:"Hospitals"}));
  expect(screen.queryByTitle("Driving directions to School")).not.toBeInTheDocument();
  expect(await screen.findByRole("button",{name:/Hospital.*1\.42/})).toHaveAttribute("aria-pressed","false");
  expect(request.mock.calls.filter(([url])=>String(url).includes("landmarks"))).toHaveLength(2);
  view.unmount(); client.clear(); vi.unstubAllEnvs();
 });
 it("hides locality and skips requests without populated project coordinates", () => {
  const request = vi.spyOn(globalThis,"fetch");
  const {container}=render(<ListingLocality property={{...property,projectLocality:undefined}}/>);
  expect(container).toBeEmptyDOMElement();
  expect(request).not.toHaveBeenCalled();
 });
});

it("defaults to the Property panel on desktop and displays only the selected tab", async () => {
 const original = window.matchMedia;
 window.matchMedia = vi.fn().mockImplementation(() => ({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 try {
  const property = toProperty({_id:"67f0e8445817e6ef8d80f822",apartmentAmenities:["Fans"]});
  render(<PropertyInfoTabs property={property}/>);
  expect(screen.getByRole("tab",{name:"Property"})).toHaveAttribute("aria-selected","true");
  expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  expect(screen.queryByRole("tab",{name:"Dimensions"})).not.toBeInTheDocument();
  expect(screen.queryByRole("tab",{name:"Project"})).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("tab",{name:"Amenities"}));
  expect(screen.getByRole("tab",{name:"Amenities"})).toHaveAttribute("aria-selected","true");
  expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  expect(screen.getByText("Fans")).toBeInTheDocument();
 } finally {window.matchMedia=original;}
});

it("shows and switches unit configurations in Property and Dimensions panels", async () => {
 const original = window.matchMedia;
 window.matchMedia = vi.fn().mockImplementation(() => ({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 try {
  const base = toProperty({_id:"67f0e8445817e6ef8d80f822",listing_details:{listing_name:"Premier"}});
  const other = {...base, rooms:[{name:"Bedroom",length:11,width:12,area:132}], bhk:3};
  render(<PropertyInfoTabs
    property={{...base,rooms:[{name:"Living",length:10,width:12,area:120}]}}
    configurations={[
      {id:"one",name:"T1-2BHK Premier",property:{...base,rooms:[{name:"Living",length:10,width:12,area:120}],bhk:2}},
      {id:"two",name:"T1-3BHK Premier",property:other},
    ]}
  />);
  await userEvent.click(screen.getByRole("button",{name:"Property unit configuration"}));
  await userEvent.click(screen.getByRole("menuitem",{name:"T1-3BHK Premier"}));
  await userEvent.click(screen.getByRole("button",{name:"Dimensions unit configuration"}));
  expect(screen.getByRole("menuitem",{name:"T1-3BHK Premier"})).toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  expect(screen.getByRole("tab",{name:"Dimensions"})).toHaveAttribute("aria-selected","true");
  expect(screen.getByText("Bedroom")).toBeInTheDocument();
  expect(screen.queryByText("Living")).not.toBeInTheDocument();
 } finally {window.matchMedia=original;}
});

it("shows a resolved unit configuration on both panels when it is the only option", async () => {
 const original = window.matchMedia;
 window.matchMedia = vi.fn().mockImplementation(() => ({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 try {
  const base = toProperty({_id:"67f0e8445817e6ef8d80f822",listing_details:{listing_name:"Premier"}});
  const property = {...base,rooms:[{name:"Living",length:10,width:12,area:120}]};
  render(<PropertyInfoTabs
    property={property}
    configurations={[{id:"one",name:"T1-2BHK Premier",property}]}
  />);
  await userEvent.click(screen.getByRole("button",{name:"Property unit configuration"}));
  expect(screen.getByRole("menuitem",{name:"T1-2BHK Premier"})).toBeInTheDocument();

  await userEvent.keyboard("{Escape}");
  await userEvent.click(screen.getByRole("tab",{name:"Dimensions"}));
  await userEvent.click(screen.getByRole("button",{name:"Dimensions unit configuration"}));
  expect(screen.getByRole("menuitem",{name:"T1-2BHK Premier"})).toBeInTheDocument();
 } finally {window.matchMedia=original;}
});

it("shows the centered underlined configuration selector in mobile panels", async () => {
 const original = window.matchMedia;
 window.matchMedia = vi.fn().mockImplementation(() => ({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 try {
  const base = toProperty({_id:"67f0e8445817e6ef8d80f822",listing_details:{listing_name:"Premier"}});
  const property = {...base,rooms:[{name:"Living",length:10,width:12,area:120}]};
  const other = {...base,rooms:[{name:"Bedroom",length:11,width:12,area:132}]};
  render(<PropertyInfoTabs
    property={property}
    configurations={[
      {id:"one",name:"T1-2BHK Premier",property},
      {id:"two",name:"T1-3BHK Premier",property:other},
    ]}
  />);

  const selectors = screen.getAllByRole("button",{name:"T1-2BHK Premier"});
  expect(selectors).toHaveLength(2);
  selectors.forEach(selector => expect(selector).toHaveClass("border-b"));

  await userEvent.click(selectors[0]);
  await userEvent.click(screen.getByRole("menuitem",{name:"T1-3BHK Premier"}));
  expect(screen.getAllByRole("button",{name:"T1-3BHK Premier"})).toHaveLength(2);
  expect(screen.getByText("Bedroom")).toBeInTheDocument();
  expect(screen.queryByText("Living")).not.toBeInTheDocument();
 } finally {window.matchMedia=original;}
});

it("switches account menus without navigating and highlights the pathname", async () => {
 const session:Session={user:{id:"account-test",firstName:"Test",lastName:"Owner",phone:"1234567890",role:"owner"},expiresAt:new Date(Date.now()+60000).toISOString()};
 const client=new QueryClient();
 navigation.pathname="/dashboard/my-searches/recommended";
 const view=render(<QueryClientProvider client={client}><AccountSidebar session={session} compact/></QueryClientProvider>);
 try {
  expect(screen.getByRole("link",{name:"Shared"})).toHaveAttribute("href","/dashboard/my-searches/recommended");
  expect(screen.getByRole("link",{name:"Shared"})).toHaveAttribute("aria-current","page");
  const previousCalls=push.mock.calls.length;
  await userEvent.click(screen.getByRole("radio",{name:"Home Owner"}));
  expect(push.mock.calls).toHaveLength(previousCalls);
  expect(screen.getByRole("link",{name:"Visits"})).toHaveAttribute("href","/dashboard/my-listings/my-visits");
  expect(screen.queryByRole("link",{name:"My Listings"})).not.toBeInTheDocument();
 }finally{view.unmount();client.clear();navigation.pathname="/properties/test";}
});
