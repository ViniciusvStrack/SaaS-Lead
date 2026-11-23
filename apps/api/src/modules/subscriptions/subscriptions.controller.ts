import { Body, Controller, Get, Headers, HttpCode, Inject, Post, Query, UnauthorizedException } from "@nestjs/common";
import type { DatabaseClient } from "@saas-lead/database";
import { SessionService } from "../auth/session.service.js";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { MercadoPagoProvider } from "./mercadopago.provider.js";
import { idempotencyKeyForSubscription } from "./mercadopago.provider.js";
import type { PrismaSubscriptionStore } from "./prisma-subscription.store.js";
import { SubscriptionEntitlementService } from "./subscription-entitlement.service.js";

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(
    @Inject("MERCADOPAGO_PROVIDER") private readonly provider: MercadoPagoProvider,
    @Inject("SUBSCRIPTION_STORE") private readonly store: PrismaSubscriptionStore,
    @Inject("MERCADOPAGO_WEBHOOK_SECRET") private readonly webhookSecret: string,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject("SUBSCRIPTIONS_DATABASE") private readonly database: DatabaseClient,
    private readonly entitlements: SubscriptionEntitlementService,
  ) {}

  @Get("current")
  async current(@Headers("cookie") cookie?: string) {
    const organizationId = await this.organizationId(cookie);
    const subscription = await this.store.findByOrganization(organizationId);
    if (!subscription) return { subscription: null };
    return { subscription: { id: subscription.id, planCode: subscription.plan.code, planName: subscription.plan.name, status: subscription.status, trialEndsAt: subscription.trialEndsAt, currentPeriodEndsAt: subscription.currentPeriodEndsAt, createdAt: subscription.createdAt } };
  }

  @Get("usage")
  async usage(@Headers("cookie") cookie?: string) {
    const organizationId = await this.organizationId(cookie);
    const subscription = await this.database.subscription.findFirst({ where: { organizationId }, include: { plan: true }, orderBy: { createdAt: "desc" } });
    const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
    const rows = await this.database.usageRecord.groupBy({ by: ["metric"], where: { organizationId, occurredAt: { gte: start } }, _sum: { quantity: true } });
    const entitlements = subscription?.plan.entitlements && typeof subscription.plan.entitlements === "object" ? subscription.plan.entitlements as Record<string, unknown> : {};
    const usage = Object.fromEntries(rows.map((row) => [row.metric, row._sum.quantity ?? 0]));
    const limits = Object.fromEntries(Object.entries(entitlements).filter(([, value]) => typeof value === "number"));
    return { periodStart: start.toISOString(), planCode: subscription?.plan.code ?? null, usage, limits };
  }

  @Post()
  async create(@Headers("cookie") cookie: string | undefined, @Body() body: { planCode?: string; payerEmail?: string; idempotencyKey?: string }) {
    const organizationId = await this.organizationId(cookie);
    if (!body.planCode || !body.payerEmail) throw new UnauthorizedException("planCode and payerEmail are required");
    const idempotencyKey = body.idempotencyKey ?? idempotencyKeyForSubscription(organizationId, body.planCode);
    const existing = await this.store.findByIdempotency(organizationId, idempotencyKey);
    if (existing) return { id: existing.id, status: existing.status, externalSubscriptionId: existing.externalSubscriptionId };
    const external = await this.provider.createSubscription({ organizationId, planCode: body.planCode, payerEmail: body.payerEmail, idempotencyKey });
    const subscription = await this.store.create({ organizationId, planCode: body.planCode, payerEmail: body.payerEmail, idempotencyKey, externalSubscriptionId: external.externalSubscriptionId, ...(external.checkoutUrl ? { checkoutUrl: external.checkoutUrl } : {}) });
    return { id: subscription.id, status: subscription.status, externalSubscriptionId: subscription.externalSubscriptionId, ...(external.checkoutUrl ? { checkoutUrl: external.checkoutUrl } : {}) };
  }

  @Post("authorize")
  async authorize(@Headers("cookie") cookie: string | undefined, @Body() body: { action?: string }) {
    const organizationId = await this.organizationId(cookie);
    if (!body.action || !/^[a-z][a-z0-9_.-]{1,80}$/.test(body.action)) throw new UnauthorizedException("action is required");
    return this.entitlements.authorize({ organizationId, action: body.action });
  }

  private async organizationId(cookie: string | undefined): Promise<string> {
    const token = cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("saas_lead_session="))?.slice("saas_lead_session=".length);
    const session = await this.sessions.requireSession(token);
    const membership = await this.database.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: session.organizationId, userId: session.userId } }, include: { organization: true, user: true } });
    if (!membership || membership.status !== "ACTIVE" || membership.organization.status !== "ACTIVE" || membership.user.status !== "ACTIVE") throw new UnauthorizedException("Authentication required");
    return membership.organizationId;
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
