import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installMockApi } from "@/mocks/install";
import { signInPathFor } from "./auth-redirect";
import { ApiError, api, configureAuth, toApiError } from "./client";
import { API_DOMAINS, domainOf, parseMockingSetting } from "./mocking";

const failWith = (status: number | null, data?: unknown, code?: string) => (config: InternalAxiosRequestConfig) =>
  Promise.reject(
    new AxiosError(
      "failed",
      code,
      config,
      null,
      status === null ? undefined : ({ status, data, headers: {}, config, statusText: "" } as AxiosResponse),
    ),
  );

describe("ApiError mapping", () => {
  const cfg = { headers: {} } as InternalAxiosRequestConfig;

  it("keeps message, code, status and field errors from the error body", () => {
    const data = { message: "Fix it.", code: "validation", fieldErrors: { phone: "Bad phone." } };
    const e = toApiError(new AxiosError("x", undefined, cfg, null, { status: 422, data, headers: {}, config: cfg, statusText: "" }));
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 422, code: "validation", message: "Fix it.", fieldErrors: { phone: "Bad phone." } });
  });

  it("falls back to a generic message for bodies that aren't the error format", () => {
    const e = toApiError(new AxiosError("x", undefined, cfg, null, { status: 502, data: "<html>Bad gateway</html>", headers: {}, config: cfg, statusText: "" }));
    expect(e).toMatchObject({ status: 502, message: "Something went wrong. Please try again.", fieldErrors: undefined });
  });

  it("drops empty fieldErrors", () => {
    const e = toApiError(new AxiosError("x", undefined, cfg, null, { status: 422, data: { message: "No.", fieldErrors: {} }, headers: {}, config: cfg, statusText: "" }));
    expect(e.fieldErrors).toBeUndefined();
  });

  it("reports network failures and timeouts as status 0", () => {
    expect(toApiError(new AxiosError("x", "ERR_NETWORK", cfg))).toMatchObject({ status: 0, code: "network" });
    expect(toApiError(new AxiosError("x", "ECONNABORTED", cfg))).toMatchObject({ status: 0, code: "timeout" });
  });

  it("rejects requests through the shared client with ApiError", async () => {
    await expect(api.get("/anything", { adapter: failWith(500, { message: "Boom", code: "internal" }) })).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      message: "Boom",
    });
  });
});

describe("auth seam", () => {
  let remove = () => {};
  afterEach(() => remove());

  it("calls onUnauthorized for a 401 outside the OTP endpoints", async () => {
    const onUnauthorized = vi.fn();
    remove = configureAuth({ onUnauthorized });
    await expect(api.get("/account/visits", { adapter: failWith(401, { message: "Sign in again.", code: "unauthenticated" }) })).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("treats a 401 from the OTP endpoints as a form error, not a lost session", async () => {
    const onUnauthorized = vi.fn();
    remove = configureAuth({ onUnauthorized });
    const wrongCode = failWith(401, { error: "Invalid OTP" });
    await expect(api.get("/user/user/login/user/0000", { adapter: wrongCode })).rejects.toMatchObject({ status: 401, message: "Invalid OTP" });
    await expect(api.get("/user/user/verify/sms/0000", { adapter: wrongCode })).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("attaches a bearer token when a token provider is configured", async () => {
    let seen: string | undefined;
    remove = configureAuth({ getAccessToken: () => "t0ken" });
    await api.get("/x", {
      adapter: async (config) => {
        seen = config.headers.get("Authorization") as string;
        return { status: 200, data: {}, headers: {}, config, statusText: "OK" };
      },
    });
    expect(seen).toBe("Bearer t0ken");
  });

  it("sends 401s to sign-in with the current page as next", () => {
    expect(signInPathFor("/account", "?tab=offers")).toBe("/login?next=%2Faccount%3Ftab%3Doffers");
    expect(signInPathFor("/dashboard/contacts")).toBe("/login?role=realtor&next=%2Fdashboard%2Fcontacts");
    expect(signInPathFor("/login")).toBeNull();
  });
});

describe("mocking switch", () => {
  it("parses on, off and domain lists", () => {
    expect(parseMockingSetting(undefined)).toEqual({ mode: "all" });
    expect(parseMockingSetting("on")).toEqual({ mode: "all" });
    expect(parseMockingSetting("OFF")).toEqual({ mode: "off" });
    expect(parseMockingSetting("dashboard, account,nope")).toEqual({ mode: "domains", domains: ["dashboard", "account"], unknown: ["nope"] });
    expect(parseMockingSetting("nope")).toEqual({ mode: "off" });
  });

  it("finds the domain of a request URL", () => {
    expect(domainOf("/properties/stats?city=Mumbai")).toBe("properties");
    expect(domainOf("trial-requests")).toBe("trial-requests");
    expect(domainOf("https://api.example.com/dashboard/contacts")).toBe("dashboard");
  });

  it("mocks only the listed domains and passes the rest to the real adapter", async () => {
    const real = vi.fn(async (config: InternalAxiosRequestConfig) => ({ status: 200, data: { real: true }, headers: {}, config, statusText: "OK" }));
    const instance = axios.create({ baseURL: "/api", adapter: real });
    installMockApi(instance, { delayMs: 0, domains: ["properties"] });
    const stats = await instance.get("/properties/stats", { params: { city: "Mumbai", intent: "buy", type: "homes" } });
    expect(stats.data.total).toBeGreaterThan(0);
    expect(real).not.toHaveBeenCalled();
    const enquiry = await instance.post("/enquiries", {});
    expect(enquiry.data).toEqual({ real: true });
    expect(real).toHaveBeenCalledOnce();
  });

  it("never mocks auth: with every domain mocked, /user/user/* still reaches the backend", async () => {
    const real = vi.fn(async (config: InternalAxiosRequestConfig) => ({ status: 200, data: { id: "u1" }, headers: {}, config, statusText: "OK" }));
    const instance = axios.create({ baseURL: "/v1/admin", adapter: real });
    installMockApi(instance, { delayMs: 0, domains: API_DOMAINS });
    await expect(instance.get("/user/user/login/user/1234", { params: { phone: "919820012345" } })).resolves.toMatchObject({ data: { id: "u1" } });
    expect(real).toHaveBeenCalledOnce();
    expect(API_DOMAINS).not.toContain("auth");
  });
});
