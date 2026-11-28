import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/session";
import { LeadDialog } from "./lead-dialog";

const push = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(search),
}));

const signIn = () =>
  useSessionStore.getState().signIn({
    user: { id: "u1", role: "seeker", firstName: "Asha", lastName: "Rao", phone: "9820012345" },
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });

/** A property card's Connect button, as the search results render it. */
function ConnectButton({ id }: { id: string }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <LeadDialog requireSignIn pendingFor={id} defaultIntent="Please contact me" mode="contact" title="Contact the realtor" description={`Listing ${id}`} target={{ propertyId: id }} recipient="the realtor">
        <Button>Connect {id}</Button>
      </LeadDialog>
    </QueryClientProvider>
  );
}

describe("Connect on a property card (sign-in required)", () => {
  beforeEach(() => {
    useSessionStore.setState({ session: null });
    push.mockReset();
    search = "";
    window.history.replaceState(null, "", "/properties?city=Mumbai&loc=Lower+Parel");
  });
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("sends a signed-out visitor to sign in, marked to come back to this card's form", async () => {
    const user = userEvent.setup();
    render(<ConnectButton id="L1" />);
    await user.click(screen.getByRole("button", { name: "Connect L1" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(push).toHaveBeenCalledTimes(1);
    const next = new URLSearchParams(push.mock.calls[0][0].split("?")[1]).get("next");
    expect(push.mock.calls[0][0]).toMatch(/^\/login\?next=/);
    expect(next).toBe("/properties?city=Mumbai&loc=Lower+Parel&enquiry=contact&enquiryFor=L1");
  });

  it("opens the form straight away when signed in, with their details filled in", async () => {
    signIn();
    const user = userEvent.setup();
    render(<ConnectButton id="L1" />);
    await user.click(screen.getByRole("button", { name: "Connect L1" }));
    expect(push).not.toHaveBeenCalled();
    expect(await screen.findByRole("dialog", { name: "Contact the realtor" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Name/ })).toHaveValue("Asha Rao");
  });

  it("after sign-in, reopens only the card that was clicked, then clears the markers", async () => {
    signIn();
    search = "city=Mumbai&enquiry=contact&enquiryFor=L2";
    window.history.replaceState(null, "", `/properties?${search}`);
    render(
      <>
        <ConnectButton id="L1" />
        <ConnectButton id="L2" />
        <ConnectButton id="L3" />
      </>,
    );
    expect(await screen.findByRole("dialog")).toHaveAccessibleDescription("Listing L2");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    await waitFor(() => expect(window.location.search).toBe("?city=Mumbai"));
  });
});
