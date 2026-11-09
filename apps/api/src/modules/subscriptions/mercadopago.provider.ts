import { createHash } from "node:crypto";
import type { BillingProvider } from "@saas-lead/contracts";

type MercadoPagoSubscription = { id?: string; payer_email?: string; init_point?: string; sandbox_init_point?: string; external_reference?: string; status?: string };

export interface MercadoPagoProviderOptions {
  accessToken: string;
  apiUrl: string;
  backUrl: string;
  planIds: Record<string, string>;
  fetcher?: typeof fetch;
}

export class MercadoPagoProvider implements BillingProvider {
  private readonly fetcher: typeof fetch;

  constructor(private readonly options: MercadoPagoProviderOptions) {
    if (!options.accessToken.trim()) throw new Error("MERCADOPAGO_ACCESS_TOKEN is required");
    if (!options.backUrl.trim()) throw new Error("MERCADOPAGO_BACK_URL is required");
    this.fetcher = options.fetcher ?? fetch;
  }

  async createSubscription(input: { organizationId: string; planCode: string; idempotencyKey: string; payerEmail?: string }): Promise<{ externalCustomerId: string; externalSubscriptionId: string; idempotencyKey: string; checkoutUrl?: string }> {
    const planId = this.options.planIds[input.planCode];
    if (!planId) throw new Error(`No Mercado Pago plan configured for ${input.planCode}`);
    if (!input.payerEmail) throw new Error("payerEmail is required to create a Mercado Pago subscription");
    const response = await this.fetcher(`${this.options.apiUrl.replace(/\/$/, "")}/preapproval`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.options.accessToken}`, "Content-Type": "application/json", "X-Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify({ preapproval_plan_id: planId, payer_email: input.payerEmail, reason: `SaaS Lead - ${input.planCode}`, external_reference: input.organizationId, back_url: this.options.backUrl }),
    });
    if (!response.ok) throw new Error(`Mercado Pago subscription creation failed (${response.status})`);
    const payload = (await response.json()) as MercadoPagoSubscription;
    if (!payload.id) throw new Error("Mercado Pago response did not include a subscription id");
    return { externalCustomerId: payload.payer_email ?? input.payerEmail, externalSubscriptionId: payload.id, idempotencyKey: input.idempotencyKey, ...(payload.init_point || payload.sandbox_init_point ? { checkoutUrl: payload.init_point ?? payload.sandbox_init_point } : {}) };
  }

  async getSubscription(externalSubscriptionId: string): Promise<{ organizationId?: string; status?: string }> {
    const response = await this.fetcher(`${this.options.apiUrl.replace(/\/$/, "")}/preapproval/${encodeURIComponent(externalSubscriptionId)}`, { headers: { Authorization: `Bearer ${this.options.accessToken}` } });
    if (!response.ok) throw new Error(`Mercado Pago subscription lookup failed (${response.status})`);
    const payload = (await response.json()) as MercadoPagoSubscription;
    return { ...(payload.external_reference ? { organizationId: payload.external_reference } : {}), ...(payload.status ? { status: payload.status } : {}) };
  }
}

export function parseMercadoPagoPlanIds(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid object");
    return Object.fromEntries(Object.entries(parsed).filter(([code, id]) => code && typeof id === "string" && id.length > 0));
  } catch {
    throw new Error("MERCADOPAGO_PLAN_IDS_JSON must be a valid JSON object");
  }
}

export function idempotencyKeyForSubscription(organizationId: string, planCode: string): string {
  return createHash("sha256").update(`${organizationId}:${planCode}`).digest("hex");
}
