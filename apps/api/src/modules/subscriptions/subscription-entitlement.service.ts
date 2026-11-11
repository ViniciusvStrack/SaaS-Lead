import type { DatabaseClient } from "@saas-lead/database";
import type { PlanContract, SubscriptionStatus } from "@saas-lead/contracts";
import { EntitlementService, type EntitlementDecision } from "./entitlement.service.js";

export class SubscriptionEntitlementService {
  private readonly rules = new EntitlementService();

  constructor(private readonly database: DatabaseClient, private readonly now: () => Date = () => new Date()) {}

  async authorize(input: { organizationId: string; action: string }): Promise<EntitlementDecision> {
    const subscription = await this.database.subscription.findFirst({ where: { organizationId: input.organizationId }, include: { plan: true }, orderBy: { createdAt: "desc" } });
    if (!subscription) return { allowed: false, reason: "SUBSCRIPTION_INACTIVE" };
    const periodStart = new Date(this.now()); periodStart.setUTCDate(1); periodStart.setUTCHours(0, 0, 0, 0);
    const usage = await this.database.usageRecord.aggregate({ where: { organizationId: input.organizationId, metric: input.action, occurredAt: { gte: periodStart } }, _sum: { quantity: true } });
    return this.rules.can({ action: input.action, usage: usage._sum.quantity ?? 0, plan: { code: subscription.plan.code, name: subscription.plan.name, entitlements: subscription.plan.entitlements as Record<string, number> } as PlanContract, subscription: { status: subscription.status as SubscriptionStatus, ...(subscription.trialEndsAt ? { trialEndsAt: subscription.trialEndsAt } : {}) }, now: this.now() });
  }
}
