import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api, ApiError } from "@/lib/api/client";
import {
  fetchUser,
  fromBackendPhone,
  withBackendUser,
  logout,
  requestOtp,
  SESSION_TTL_MS,
  toBackendPhone,
  toSession,
  verifyOtp,
} from "@/services/auth";

/* The Rezide backend's /user/user/* endpoints, answered here by a test double in place of the mock API. */

describe("phone numbers", () => {
  it("adds the country code the backend stores, and strips it for the UI", () => {
    expect(toBackendPhone("9820012345")).toBe("919820012345");
    expect(fromBackendPhone("919820012345")).toBe("9820012345");
    expect(fromBackendPhone("+91 98200 12345")).toBe("9820012345");
  });
});

describe("toSession", () => {
  const input = { phone: "9820012345", code: "1234", role: "seeker" as const };

  it("maps the backend user to the UI session", () => {
    const s = toSession({ id: "u7", firstname: "Asha", lastname: "Rao", phone: "919820012345", email: "a@b.in" }, input, 0);
    expect(s).toEqual({
      user: { id: "u7", role: "seeker", firstName: "Asha", lastName: "Rao", phone: "9820012345", email: "a@b.in", firm: undefined },
      expiresAt: new Date(SESSION_TTL_MS).toISOString(),
    });
  });

  it("reads a user wrapped in { data } and falls back to what was typed", () => {
    const s = toSession({ data: { _id: "u8" } }, { ...input, firstName: "Ravi", lastName: "K" });
    expect(s.user).toMatchObject({ id: "u8", firstName: "Ravi", lastName: "K", phone: "9820012345" });
  });
});

describe("backend OTP flows", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    backend = new MockAdapter(api);
  });
  afterEach(() => backend.restore());

  it("signs a customer in with the login OTP endpoints", async () => {
    backend.onGet("/user/user/login/otp/mobile/919820012345", { params: { role: "customer" } }).reply(200, { message: "OTP sent" });
    backend.onGet("/user/user/login/user/1234", { params: { phone: "919820012345" } }).reply(200, { id: "u1", firstname: "Asha", lastname: "Rao", phone: "919820012345" });

    const challenge = await requestOtp("9820012345");
    expect(challenge).toMatchObject({ phone: "9820012345", length: 4 });

    const s = await verifyOtp({ phone: "9820012345", code: "1234", role: "owner" });
    expect(s.user).toMatchObject({ id: "u1", role: "owner", firstName: "Asha", phone: "9820012345" });
  });

  it("shows the backend's error message for a wrong code", async () => {
    // The live backend answers a wrong code with exactly this.
    backend.onGet(/\/login\/user\//).reply(400, { error: "Invalid OTP" });
    const err = await verifyOtp({ phone: "9820012345", code: "0000", role: "seeker" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("Invalid OTP");
  });

  it("signs up with the SMS OTP, then creates the customer", async () => {
    backend.onGet("/user/user/send/sms/otp/919820012345").reply(200, {});
    backend.onGet("/user/user/verify/sms/1234", { params: { phone: "919820012345" } }).reply(200, {});
    backend.onPost("/user/user/add/customer").reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        user_role: "customer",
        user_group: "64b263414a6652391296cb74",
        phone: "919820012345",
        firstname: "Asha",
        lastname: "Rao",
        email: "a@b.in",
      });
      return [201, { data: { _id: "u2" } }];
    });

    await requestOtp("9820012345", { purpose: "signup" });
    const s = await verifyOtp(
      { phone: "9820012345", code: "1234", role: "seeker", firstName: "Asha", lastName: "Rao", email: "a@b.in" },
      { purpose: "signup" },
    );
    expect(s.user).toMatchObject({ id: "u2", firstName: "Asha", email: "a@b.in" });
  });

  it("asks the user to sign in when sign-up returns no account id", async () => {
    backend.onGet(/\/verify\/sms\//).reply(200, {});
    backend.onPost("/user/user/add/customer").reply(201, { message: "Created" });
    const err = await verifyOtp({ phone: "9820012345", code: "1234", role: "seeker", firstName: "A" }, { purpose: "signup" }).catch((e) => e);
    expect(err).toMatchObject({ status: 409, code: "signin_required" });
  });

  it("only checks the number for a one-off verification", async () => {
    backend.onGet("/user/user/send/sms/otp/919820012345").reply(200, {});
    backend.onGet("/user/user/verify/sms/1234").reply(200, {});
    await requestOtp("9820012345", { purpose: "verify", role: "realtor" });
    await expect(verifyOtp({ phone: "9820012345", code: "1234", role: "realtor" }, { purpose: "verify" })).resolves.toBeTruthy();
    expect(backend.history.post).toHaveLength(0);
  });

  it("refuses realtor sign-up before sending any SMS", async () => {
    await expect(requestOtp("9820012345", { purpose: "signup", role: "realtor" })).rejects.toMatchObject({ code: "realtor_signup_unavailable" });
    expect(backend.history.get).toHaveLength(0);
  });

  it("signs out on the backend", async () => {
    backend.onPost("/user/user/logout").reply(200, {});
    await logout();
    expect(backend.history.post).toHaveLength(1);
  });

  it("loads the user's record by id", async () => {
    backend.onGet("/user/user/u1").reply(200, { _id: "u1", firstname: "Asha", lastname: "Rao", phone: "919820012345", email: "a@b.in" });
    await expect(fetchUser("u1")).resolves.toMatchObject({ _id: "u1", firstname: "Asha", email: "a@b.in" });
  });
});

describe("withBackendUser", () => {
  const user = { id: "u1", role: "owner" as const, firstName: "Asha", lastName: "Rao", phone: "9820012345" };

  it("takes the backend's latest name, phone and email but keeps the UI role", () => {
    expect(withBackendUser(user, { firstname: "Asha M", phone: "919000000001", email: "new@b.in" })).toEqual({
      ...user,
      firstName: "Asha M",
      phone: "9000000001",
      email: "new@b.in",
    });
  });

  it("keeps what the backend leaves blank", () => {
    expect(withBackendUser(user, { firstname: " ", lastname: "" })).toEqual(user);
  });
});
