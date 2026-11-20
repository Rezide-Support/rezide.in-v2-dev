import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session";
import { SignInModal } from "./sign-in-modal";

const nav = vi.hoisted(() => ({ query: "modal=signIn", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/search",
  useSearchParams: () => new URLSearchParams(nav.query),
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, prefetch: vi.fn() }),
}));

const renderModal = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <SignInModal />
    </QueryClientProvider>,
  );

describe("sign-in popup (as rezide.in's ?modal=signIn)", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    backend = new MockAdapter(api);
    nav.query = "modal=signIn";
    nav.replace.mockReset();
    useSessionStore.setState({ session: null });
  });
  afterEach(() => backend.restore());

  it("opens with ?modal=signIn: one field, CONTINUE until it can go on", async () => {
    const user = userEvent.setup();
    renderModal();
    expect(screen.getByRole("dialog", { name: "Sign In to your Rezide Account" })).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Continue" });
    expect(button).toBeDisabled();
    await user.type(screen.getByPlaceholderText("Enter email address or mobile number"), "98200");
    expect(screen.getByRole("button", { name: "Send OTP" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Sign Up" })).toHaveAttribute("href", "/signup?next=%2Fprojects%2Fsearch");
  });

  it("signs in with a mobile number and the OTP, then closes over the same page", async () => {
    backend.onGet(/\/user\/user\/login\/otp\/mobile\/919820012345/).reply(200, {});
    backend.onGet(/\/user\/user\/login\/user\/1234/).reply(200, { data: { _id: "u1", firstname: "Asha", phone: "919820012345" } });
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByPlaceholderText("Enter email address or mobile number"), "9820012345");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));
    expect(await screen.findByText("OTP Verification")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Digit 1" }), "1234");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(useSessionStore.getState().session?.user.id).toBe("u1"));
    expect(nav.replace).toHaveBeenCalledWith("/projects/search", { scroll: false });
  });

  it("asks for a password for an email address and signs in with it", async () => {
    backend.onPost(/\/user\/user\/login$/).reply(200, { data: { _id: "u2", firstname: "Ravi", email: "ravi@example.com" } });
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByPlaceholderText("Enter email address or mobile number"), "ravi@example.com");
    await user.type(screen.getByPlaceholderText("Enter password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    await waitFor(() => expect(useSessionStore.getState().session?.user.id).toBe("u2"));
    expect(JSON.parse(backend.history.post[0].data)).toEqual({ email: "ravi@example.com", password: "secret123" });
  });

  it("stays closed without ?modal=signIn", () => {
    nav.query = "";
    renderModal();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
