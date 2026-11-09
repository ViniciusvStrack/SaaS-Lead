import { Body, Controller, Get, Headers, HttpCode, Inject, Post, Query, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { MercadoPagoProvider } from "./mercadopago.provider.js";
import { idempotencyKeyForSubscription } from "./mercadopago.provider.js";
import type { PrismaSubscriptionStore } from "./prisma-subscription.store.js";

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(
    @Inject("MERCADOPAGO_PROVIDER") private readonly provider: MercadoPagoProvider,
    @Inject("SUBSCRIPTION_STORE") private readonly store: PrismaSubscriptionStore,
    @Inject("MERCADOPAGO_WEBHOOK_SECRET") private readonly webhookSecret: string,
  ) {}

  @Get("current")
  async current(@Headers("x-organization-id") organizationId: string | undefined) {
    if (!organizationId) throw new UnauthorizedException("Organization is required");
    const subscription = await this.store.findByOrganization(organizationId);
    if (!subscription) return { subscription: null };
    return { subscription: { id: subscription.id, planCode: subscription.plan.code, planName: subscription.plan.name, status: subscription.status, trialEndsAt: subscription.trialEndsAt, currentPeriodEndsAt: subscription.currentPeriodEndsAt, createdAt: subscription.createdAt } };
  }

  @Post()
  async create(@Headers("x-organization-id") organizationId: string | undefined, @Body() body: { planCode?: string; payerEmail?: string; idempotencyKey?: string }) {
    if (!organizationId || !body.planCode || !body.payerEmail) throw new UnauthorizedException("Organization, planCode and payerEmail are required");
    const idempotencyKey = body.idempotencyKey ?? idempotencyKeyForSubscription(organizationId, body.planCode);
    const existing = await this.store.findByIdempotency(organizationId, idempotencyKey);
    if (existing) return { id: existing.id, status: existing.status, externalSubscriptionId: existing.externalSubscriptionId };
    const external = await this.provider.createSubscription({ organizationId, planCode: body.planCode, payerEmail: body.payerEmail, idempotencyKey });
    const subscription = await this.store.create({ organizationId, planCode: body.planCode, payerEmail: body.payerEmail, idempotencyKey, externalSubscriptionId: external.externalSubscriptionId, ...(external.checkoutUrl ? { checkoutUrl: external.checkoutUrl } : {}) });
    return { id: subscription.id, status: subscription.status, externalSubscriptionId: subscription.externalSubscriptionId, ...(external.checkoutUrl ? { checkoutUrl: external.checkoutUrl } : {}) };
  }

  @Post("webhook")
  @HttpCode(200)
  async webhook(@Query("data.id") dataId: string | undefined, @Query("id") eventId: string | undefined, @Headers("x-signature") signature: string | undefined, @Headers("x-request-id") requestId: string | undefined, @Body() body: { id?: string; date_created?: string; data?: { id?: string }; external_reference?: string; action?: string; type?: string }) {
    const resourceId = dataId ?? body.data?.id;
    if (!resourceId || !eventId || !this.verifySignature(signature, requestId, resourceId)) throw new UnauthorizedException("Invalid Mercado Pago webhook signature");
    const subscription = await this.provider.getSubscription(resourceId);
    const organizationId = subscription.organizationId;
    if (!organizationId) return { received: true, ignored: true };
    const status = mapStatus(subscription.status ?? body.action);
    await this.store.recordEvent({ externalEventId: eventId, externalSubscriptionId: resourceId, eventCreatedAt: body.date_created ? new Date(body.date_created) : new Date(), payload: body, status, organizationId });
    return { received: true };
  }

  private verifySignature(signature: string | undefined, requestId: string | undefined, dataId: string): boolean {
    if (!signature || !requestId) return false;
    const values = Object.fromEntries(signature.split(",").map((item) => item.split("=", 2) as [string, string]));
    const ts = values.ts; const v1 = values.v1;
    if (!ts || !v1 || !/^[a-f\d]{64}$/i.test(v1)) return false;
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac("sha256", this.webhookSecret).update(manifest).digest();
    const received = Buffer.from(v1, "hex");
    return received.length === expected.length && timingSafeEqual(received, expected);
  }
}

function mapStatus(action: string | undefined): "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "TRIALING" {
  if (action === "cancelled" || action?.includes("cancel")) return "CANCELED";
  if (action === "authorized" || action === "active" || action?.includes("approved")) return "ACTIVE";
  if (action === "paused" || action === "pending" || action?.includes("rejected") || action?.includes("failed")) return "PAST_DUE";
  return "INCOMPLETE";
}
