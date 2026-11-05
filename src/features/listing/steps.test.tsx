import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommercialsStep } from "./steps";

const renderStep = (errors: Record<string, string>, price = "") =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CommercialsStep draft={{ intent: "sell", category: "office", price }} update={() => {}} errors={errors} />
    </QueryClientProvider>,
  );

describe("CommercialsStep price field", () => {
  it("labels the real input and marks it invalid, so the wizard can focus it", () => {
    renderStep({ price: "Enter the price." });
    const input = screen.getByLabelText(/Sale price/);
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/Enter the price\./);
  });

  it("describes the amount in words once a price is entered", () => {
    renderStep({}, "25000000");
    const input = screen.getByLabelText(/Sale price/);
    expect(input).toHaveValue("2,50,00,000");
    expect(input).toHaveAccessibleDescription(/2\.5 Cr/);
  });
});
