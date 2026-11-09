import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BillingView } from "./page.js";

describe("billing dashboard", () => {
  it("shows the current subscription and Mercado Pago status", () => {
    const html = renderToStaticMarkup(<BillingView result={{ status: "ready", subscription: { id: "sub-1", planCode: "professional", planName: "Profissional", status: "ACTIVE", trialEndsAt: null, currentPeriodEndsAt: null, createdAt: "2026-11-09T00:00:00.000Z" } }} />);
    expect(html).toContain("Plano e uso");
    expect(html).toContain("Profissional");
    expect(html).toContain("Mercado Pago");
    expect(html).toContain("Assinatura gerenciada pelo Mercado Pago");
  });
});
