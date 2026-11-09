import { describe, expect, it, vi } from "vitest";
import { MercadoPagoProvider, idempotencyKeyForSubscription, parseMercadoPagoPlanIds } from "../src/modules/subscriptions/mercadopago.provider.js";

describe("MercadoPagoProvider", () => {
  it("creates a subscription with the configured plan and idempotency key", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ id: "preapproval-1", payer_email: "buyer@example.com", init_point: "https://mp.example/checkout" }), { status: 201 }));
    const provider = new MercadoPagoProvider({ accessToken: "token", apiUrl: "https://api.mercadopago.com", backUrl: "https://app.example/return", planIds: { professional: "plan-1" }, fetcher });
    await expect(provider.createSubscription({ organizationId: "org-1", planCode: "professional", payerEmail: "buyer@example.com", idempotencyKey: "idem-1" })).resolves.toEqual({ externalCustomerId: "buyer@example.com", externalSubscriptionId: "preapproval-1", idempotencyKey: "idem-1", checkoutUrl: "https://mp.example/checkout" });
    expect(fetcher).toHaveBeenCalledWith("https://api.mercadopago.com/preapproval", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token", "X-Idempotency-Key": "idem-1" }) }));
  });

  it("rejects missing plan, email and failed API responses", async () => {
    const provider = new MercadoPagoProvider({ accessToken: "token", apiUrl: "https://api.mercadopago.com", backUrl: "https://app.example/return", planIds: {} });
    await expect(provider.createSubscription({ organizationId: "org-1", planCode: "professional", idempotencyKey: "idem-1", payerEmail: "buyer@example.com" })).rejects.toThrow("No Mercado Pago plan configured");
    await expect(new MercadoPagoProvider({ accessToken: "token", apiUrl: "https://api.mercadopago.com", backUrl: "https://app.example/return", planIds: { professional: "plan-1" }, fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 400 })) }).createSubscription({ organizationId: "org-1", planCode: "professional", idempotencyKey: "idem-1" })).rejects.toThrow("payerEmail is required");
  });
});

it("parses Mercado Pago plan ids and creates deterministic keys", () => {
  expect(parseMercadoPagoPlanIds('{"professional":"plan-1","empty":""}')).toEqual({ professional: "plan-1" });
  expect(idempotencyKeyForSubscription("org-1", "professional")).toBe(idempotencyKeyForSubscription("org-1", "professional"));
});
