import { describe, expect, it, vi } from "vitest";
import { SubscriptionEntitlementService } from "../src/modules/subscriptions/subscription-entitlement.service.js";

describe("SubscriptionEntitlementService", () => {
  it("authorizes usage below the monthly plan limit", async () => {
    const database = {
      subscription: { findFirst: vi.fn().mockResolvedValue({ status: "ACTIVE", createdAt: new Date(), plan: { code: "professional", name: "Profissional", entitlements: { "message.send": 100 } } }) },
      usageRecord: { aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: 40 } }) },
    };
    await expect(new SubscriptionEntitlementService(database as never, () => new Date("2026-11-09T12:00:00Z")).authorize({ organizationId: "org-1", action: "message.send" })).resolves.toMatchObject({ allowed: true, remaining: 60 });
  });

  it("blocks an inactive subscription before reading usage", async () => {
    const database = { subscription: { findFirst: vi.fn().mockResolvedValue(null) }, usageRecord: { aggregate: vi.fn() } };
    await expect(new SubscriptionEntitlementService(database as never).authorize({ organizationId: "org-1", action: "message.send" })).resolves.toEqual({ allowed: false, reason: "SUBSCRIPTION_INACTIVE" });
    expect(database.usageRecord.aggregate).not.toHaveBeenCalled();
  });

  it("blocks usage at the plan limit", async () => {
    const database = {
      subscription: { findFirst: vi.fn().mockResolvedValue({ status: "ACTIVE", createdAt: new Date(), plan: { code: "professional", name: "Profissional", entitlements: { "message.send": 100 } } }) },
      usageRecord: { aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: 100 } }) },
    };
    await expect(new SubscriptionEntitlementService(database as never).authorize({ organizationId: "org-1", action: "message.send" })).resolves.toEqual({ allowed: false, reason: "LIMIT_EXCEEDED", limit: 100 });
  });
});
