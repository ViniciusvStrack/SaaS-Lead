import { describe, expect, it } from "vitest";
import { createTenantContext } from "@saas-lead/database";
import { InMemoryPrivacyStore, PrivacyLifecycleService } from "../src/modules/privacy/privacy-lifecycle.service.js";

const tenant = createTenantContext({ organizationId: "org-a", userId: "user-a", role: "OWNER" });

describe("privacy lifecycle", () => {
  it("exports only the tenant data and omits operational secrets", async () => {
    const store = new InMemoryPrivacyStore([
      { organizationId: "org-a", subjectId: "contact-1", kind: "contact", data: { displayName: "Ana", credentialReference: "secret-a" } },
      { organizationId: "org-b", subjectId: "contact-1", kind: "contact", data: { displayName: "Bia" } },
    ]);
    const service = new PrivacyLifecycleService(store);

    const result = await service.exportSubject(tenant, "contact-1");

    expect(result.records).toEqual([{ kind: "contact", data: { displayName: "Ana" } }]);
    expect(JSON.stringify(result)).not.toContain("secret-a");
    expect(JSON.stringify(result)).not.toContain("Bia");
  });

  it("is idempotent and retains data when a documented legal hold applies", async () => {
    const store = new InMemoryPrivacyStore([{ organizationId: "org-a", subjectId: "contact-1", kind: "contact", data: { displayName: "Ana" } }]);
    const service = new PrivacyLifecycleService(store);
    const input = { requestKey: "privacy-42", subjectId: "contact-1", legalHoldReason: "contractual-dispute" };

    const first = await service.requestDeletion(tenant, input);
    const repeated = await service.requestDeletion(tenant, input);

    expect(first).toEqual(repeated);
    expect(first.status).toBe("RETAINED_LEGAL_HOLD");
    expect(store.records).toHaveLength(1);
    expect(store.audit).toHaveLength(1);
  });

  it("queues deletion and never writes sensitive content to the audit log", async () => {
    const store = new InMemoryPrivacyStore([{ organizationId: "org-a", subjectId: "contact-1", kind: "message", data: { body: "segredo comercial", phone: "+5511999999999" } }]);
    const service = new PrivacyLifecycleService(store);

    const request = await service.requestDeletion(tenant, { requestKey: "privacy-43", subjectId: "contact-1" });
    expect(request.status).toBe("QUEUED");
    await service.processDeletion(request.id);

    expect(store.records).toHaveLength(0);
    expect(store.requests[0]?.status).toBe("COMPLETED");
    expect(JSON.stringify(store.audit)).not.toContain("segredo comercial");
    expect(JSON.stringify(store.audit)).not.toContain("+5511999999999");
  });
});
