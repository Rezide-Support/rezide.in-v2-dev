import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session";
import { SaveActions, SaveIconButton } from "./save-actions";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/search",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), toast) }));

const SHORTLIST = "/shortlist/user/statistic/u1";
const heart = () => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <SaveIconButton list="shortlist" kind="project" id="p1" title="Shankha Arion" />
  </QueryClientProvider>
);
const signIn = () =>
  useSessionStore.getState().signIn({
    user: { id: "u1", role: "seeker", firstName: "Asha", lastName: "Rao", phone: "9820012345" },
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });

describe("project shortlist heart (as rezide.in's project card)", () => {
  let backend: MockAdapter;
  beforeEach(() => {
    backend = new MockAdapter(api);
    useSessionStore.setState({ session: null });
    sessionStorage.clear();
    push.mockReset();
    toast.success.mockReset();
  });
  afterEach(() => backend.restore());

  it("shortlists the project on the account, as type 'project'", async () => {
    signIn();
    backend.onGet(SHORTLIST).reply(200, { result: { shortlist: [] } });
    backend.onPost(SHORTLIST).reply(200, { status: "success" });
    const user = userEvent.setup();
    render(heart());
    const button = await screen.findByRole("button", { name: "Shortlist Shankha Arion" });
    await waitFor(() => expect(backend.history.get.length).toBeGreaterThan(0));
    await user.click(button);
    await waitFor(() => expect(backend.history.post).toHaveLength(1));
    expect(backend.history.post[0].params).toEqual({ listing_id: "p1", action: "add", type: "project" });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Shortlisted successfully"));
  });

  it("removes a shortlisted project", async () => {
    signIn();
    backend.onGet(SHORTLIST).reply(200, { result: { shortlist: [{ listing_id: "p1" }] } });
    backend.onPost(SHORTLIST).reply(200, { status: "success" });
    const user = userEvent.setup();
    render(heart());
    const button = screen.getByRole("button", { name: "Shortlist Shankha Arion" });
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
    await user.click(button);
    await waitFor(() => expect(backend.history.post[0]?.params).toMatchObject({ action: "remove", type: "project" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Removed from shortlist"));
  });

  it("opens the sign-in popup for a guest, then shortlists the project once they're signed in", async () => {
    backend.onGet(SHORTLIST).reply(200, { result: { shortlist: [] } });
    backend.onPost(SHORTLIST).reply(200, { status: "success" });
    const user = userEvent.setup();
    render(heart());
    await user.click(screen.getByRole("button", { name: "Shortlist Shankha Arion" }));
    // rezide.in's ?modal=signIn over the same page.
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/\?modal=signIn$/), { scroll: false });
    expect(backend.history.post).toHaveLength(0);

    // Signing in (in the popup) finishes the shortlist without another tap.
    signIn();
    await waitFor(() => expect(backend.history.post[0]?.params).toEqual({ listing_id: "p1", action: "add", type: "project" }));
    expect(sessionStorage.getItem("rezide.pendingSave")).toBeNull();
  });

  it("opens the sign-in popup for a guest's compare, then adds the project once they're signed in", async () => {
    const { useSavedStore } = await import("@/stores/saved");
    useSavedStore.setState({ compare: [] });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SaveIconButton list="compare" kind="project" id="p1" title="Shankha Arion" />
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Compare Shankha Arion" }));
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/\?modal=signIn$/), { scroll: false });
    expect(useSavedStore.getState().compare).toHaveLength(0);
    signIn();
    await waitFor(() => expect(useSavedStore.getState().compare.map((i) => i.id)).toEqual(["p1"]));
  });

  it("opens the same popup from the property detail's compare and shortlist actions", async () => {
    const user = userEvent.setup();
    render(<QueryClientProvider client={new QueryClient()}><SaveActions kind="property" id="listing-1" title="Apartment" path="/properties/listing-1" intent="buy" /></QueryClientProvider>);
    await user.click(screen.getByRole("button", { name: "Compare" }));
    await user.click(screen.getByRole("button", { name: "Shortlist" }));
    expect(push).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenNthCalledWith(1, expect.stringContaining("modal=signIn"), { scroll: false });
    expect(push).toHaveBeenNthCalledWith(2, expect.stringContaining("modal=signIn"), { scroll: false });
    expect(backend.history.post).toHaveLength(0);
  });

  it("requires sign-in even when the guest previously saved the property for comparison", async () => {
    const { useSavedStore } = await import("@/stores/saved");
    useSavedStore.setState({ compare: [{ kind: "property", id: "listing-1", title: "Apartment", intent: "buy", savedAt: new Date().toISOString() }] });
    const user = userEvent.setup();
    render(<QueryClientProvider client={new QueryClient()}><SaveIconButton list="compare" kind="property" id="listing-1" title="Apartment" intent="buy" /></QueryClientProvider>);
    await user.click(screen.getByRole("button", { name: "Compare Apartment" }));
    expect(push).toHaveBeenCalledWith(expect.stringContaining("modal=signIn"), { scroll: false });
    expect(useSavedStore.getState().compare).toHaveLength(1);
  });
});
