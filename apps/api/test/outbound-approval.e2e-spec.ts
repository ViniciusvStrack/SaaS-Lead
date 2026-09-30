import { describe, expect, it } from "vitest";
import { createTenantContext } from "@saas-lead/database";
import { PolicyEngine } from "@saas-lead/policy";
import { InMemoryOutboundStore, OutboundApprovalService } from "../src/modules/outbound/outbound-approval.service.js";

const tenant = createTenantContext({ organizationId: "org-a", userId: "user-a", role: "AGENT" });
const context = { consentStatus: "GRANTED" as const, optedOut: false, withinCustomerCareWindow: true, templateStatus: undefined, cooldownSatisfied: true, accountActive: true };

describe("outbound approval", () => {
  it("torna clique duplo idempotente sem publicar duas vezes", async () => {
    const store = new InMemoryOutboundStore();
    const service = new OutboundApprovalService(store, new PolicyEngine());
    const input = { opportunityId: "opp-1", conversationId: "conv-1", content: "Olá, posso ajudar?", idempotencyKey: "approve-1", context };
    const first = await service.approve(tenant, input);
    const second = await service.approve(tenant, input);
    expect(second.id).toBe(first.id);
    expect(store.queuedJobs).toEqual([{ queue: "message.send", outboundMessageId: first.id, organizationId: "org-a" }]);
  });
  it("bloqueia aprovação quando a política reprova", async () => {
    const store = new InMemoryOutboundStore();
    const result = await new OutboundApprovalService(store, new PolicyEngine()).approve(tenant, { opportunityId: "opp-1", conversationId: "conv-1", content: "Retorno", idempotencyKey: "blocked-1", context: { ...context, optedOut: true } });
    expect(result.status).toBe("BLOCKED");
    expect(store.queuedJobs).toHaveLength(0);
  });
});
