import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeOrder } from "@/features/corner/pricing";
import { comparePrice } from "@/features/listing/price-analysis";
import { nearestCity, useDetectCity } from "@/features/location/geolocation";
import { formatPrice } from "@/lib/format";
import { createEnquiry } from "@/services/mutations";

/* Listing search and detail are live; they are tested in src/services/properties.test.ts. */
describe("mock catalogue API", () => {
  it("validates enquiries server-side", async () => {
    await expect(createEnquiry({ name: "", phone: "1", channel: "callback" })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { name: expect.any(String), phone: expect.any(String) },
    });
    const ok = await createEnquiry({ name: "Asha", phone: "9820012345", channel: "visit", propertyId: "x" });
    expect(ok.status).toBe("received");
  });
});

describe("Detect my location", () => {
  const original = navigator.geolocation;
  afterEach(() => Object.defineProperty(navigator, "geolocation", { value: original, configurable: true }));

  const mockGeo = (impl: (ok: PositionCallback, fail: PositionErrorCallback) => void) =>
    Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition: impl }, configurable: true });

  it("picks the nearest supported city, or none when too far", () => {
    expect(nearestCity(19.1, 72.9)).toBe("Mumbai");
    expect(nearestCity(12.95, 77.6)).toBe("Bengaluru");
    expect(nearestCity(51.5, -0.12)).toBeNull();
  });

  it("reports permission denied instead of silently choosing a city", () => {
    const onFound = vi.fn();
    mockGeo((_ok, fail) => fail({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "" } as GeolocationPositionError));
    const { result } = renderHook(() => useDetectCity(onFound));
    act(() => result.current.detect());
    expect(result.current.state).toEqual({ status: "denied" });
    expect(onFound).not.toHaveBeenCalled();
  });

  it("reports unavailable and out-of-range positions", () => {
    const onFound = vi.fn();
    mockGeo((_ok, fail) => fail({ code: 2, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "" } as GeolocationPositionError));
    const a = renderHook(() => useDetectCity(onFound));
    act(() => a.result.current.detect());
    expect(a.result.current.state).toEqual({ status: "unavailable", reason: "position" });

    mockGeo((ok) => ok({ coords: { latitude: 51.5, longitude: -0.12 } } as GeolocationPosition));
    const b = renderHook(() => useDetectCity(onFound));
    act(() => b.result.current.detect());
    expect(b.result.current.state).toEqual({ status: "out-of-range" });
    expect(onFound).not.toHaveBeenCalled();
  });

  it("selects the detected city when found", () => {
    const onFound = vi.fn();
    mockGeo((ok) => ok({ coords: { latitude: 18.52, longitude: 73.85 } } as GeolocationPosition));
    const { result } = renderHook(() => useDetectCity(onFound));
    act(() => result.current.detect());
    expect(onFound).toHaveBeenCalledWith("Pune");
  });
});

describe("pricing and formatting", () => {
  it("itemises orders with GST and annual add-on discounts", () => {
    const o = computeOrder({ planId: "intermediate", seats: 2, annual: true, member: false, addons: ["lead-router", "website"], packMillions: 5 });
    expect(o.lines.map((l) => l.amount)).toEqual([4000 * 2 * 12, 10000 * 0.8 * 12, 15000, 1125]);
    expect(o.gst).toBe(Math.round(o.subtotal * 0.18));
    expect(o.total).toBe(o.subtotal + o.gst);
    expect(computeOrder({ planId: null, seats: 1, annual: false, member: false, addons: [], packMillions: 0 }).total).toBe(0);
  });

  it("compares a price with a sample range", () => {
    expect(comparePrice(5e7, { lo: 4e7, med: 5e7, hi: 6e7 })).toMatchObject({ within: true, delta: 0 });
    expect(comparePrice(3e7, { lo: 4e7, med: 5e7, hi: 6e7 })).toMatchObject({ within: false, below: true });
  });

  it("formats Indian prices", () => {
    expect(formatPrice(9_20_00_000)).toBe("₹ 9.2 Cr");
    expect(formatPrice(1_45_000, { monthly: true })).toBe("₹ 1.45 L / mo");
    expect(formatPrice(68_000)).toBe("₹ 68k");
  });
});
