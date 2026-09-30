import { describe, expect, it } from "vitest";
import { createTenantContext } from "@saas-lead/database";

import { InMemoryAuditStore } from "../src/modules/audit/in-memory-audit.store.js";
import { AuditService } from "../src/modules/audit/audit.service.js";

describe("audit service", () => {
  it("records actor, tenant and resource context for sensitive changes", async () => {
    const store = new InMemoryAuditStore();
    const service = new AuditService(store);

    await service.record({
      tenant: createTenantContext({ organizationId: "org-a", userId: "user-a", role: "ADMIN" }),
      action: "business_settings.updated",
      resourceType: "BusinessSettings",
      resourceId: "settings-a",
      metadata: { changedFields: ["tone"] },
    });

    expect(store.entries).toEqual([
      expect.objectContaining({
        organizationId: "org-a",
        actorType: "USER",
        actorId: "user-a",
        action: "business_settings.updated",
        resourceType: "BusinessSettings",
        resourceId: "settings-a",
        metadata: { changedFields: ["tone"] },
        occurredAt: expect.any(Date),
      }),
    ]);
  });
});
