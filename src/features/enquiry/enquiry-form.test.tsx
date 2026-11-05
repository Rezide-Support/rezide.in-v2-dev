import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EnquiryForm } from "./enquiry-form";

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <EnquiryForm target={{ propertyId: "mum-worli-lodha-park-b1702" }} realtorName="AssetPro" />
    </QueryClientProvider>,
  );

describe("EnquiryForm", () => {
  it("shows actionable inline errors and does not submit invalid data", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: /send enquiry/i }));
    expect(await screen.findByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Enter your mobile number.")).toBeInTheDocument();
    expect(screen.getByText("Please agree so the realtor can contact you.")).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("asks for a date only when a site visit is chosen", async () => {
    renderForm();
    expect(screen.queryByLabelText(/preferred visit date/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Site visit" }));
    expect(screen.getByLabelText(/preferred visit date/i)).toBeInTheDocument();
  });

  it("confirms a demo submission without claiming the realtor was notified", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/full name/i), "Asha Rao");
    await userEvent.type(screen.getByRole("textbox", { name: /mobile number/i }), "9820012345");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /send enquiry/i }));
    expect(await screen.findByText("Enquiry recorded in demo mode.")).toBeInTheDocument();
    expect(screen.getByText(/AssetPro has not been notified/)).toBeInTheDocument();
  });
});
