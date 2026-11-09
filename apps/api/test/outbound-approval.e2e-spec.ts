import { describe, expect, it, vi } from "vitest";
import { createTenantContext } from "@saas-lead/database";
import { PolicyEngine } from "@saas-lead/policy";
import {
  InMemoryOutboundStore,
  OutboundApprovalService,
  type ApprovalContextReader,
} from "../src/modules/outbound/outbound-approval.service.js";

const tenant = createTenantContext({ organizationId: "org-a", userId: "user-a", role: "AGENT" });
const context = {
  consentStatus: "GRANTED" as const,
  optedOut: false,
  withinCustomerCareWindow: true,
  templateStatus: undefined,
  cooldownSatisfied: true,
  accountActive: true,
};

const input = {
  opportunityId: "opp-1",
  conversationId: "conv-1",
  content: "Olá, posso ajudar?",
  idempotencyKey: "approve-1",
  context,
};

function serviceWith(reader?: ApprovalContextReader) {
  const store = new InMemoryOutboundStore();
  const service = new OutboundApprovalService(store, new PolicyEngine(), {
    queue: store,
    ...(reader ? { context: reader } : {}),
  });
  return { store, service };
}

describe("outbound approval", () => {
  it("torna clique duplo idempotente sem publicar duas vezes", async () => {
    const read = vi.fn(async () => context);
    const { store, service } = serviceWith({ read });
    const first = await service.approve(tenant, input);
    const second = await service.approve(tenant, input);

    expect(second.id).toBe(first.id);
    expect(read).toHaveBeenCalledTimes(1);
    expect(store.queuedJobs).toEqual([
      { queue: "message.send", outboundMessageId: first.id, organizationId: "org-a" },
    ]);
  });

  it("bloqueia aprovação quando a política reprova", async () => {
    const { store, service } = serviceWith();
    const result = await service.approve(tenant, {
      ...input,
      content: "Retorno",
      idempotencyKey: "blocked-1",
      context: { ...context, optedOut: true },
    });

    expect(result.status).toBe("BLOCKED");
    expect(store.queuedJobs).toHaveLength(0);
  });

  it("usa o contexto derivado no servidor e ignora o contexto do cliente", async () => {
    const { store, service } = serviceWith({
      read: async () => ({ ...context, consentStatus: "REVOKED", optedOut: true }),
    });
    const result = await service.approve(tenant, {
      ...input,
      idempotencyKey: "server-context",
      context: { ...context, consentStatus: "GRANTED", optedOut: false },
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.policyDecision.reasons).toContain("OPTED_OUT");
    expect(store.queuedJobs).toHaveLength(0);
  });

  it("republica o job determinístico ao repetir uma aprovação já persistida", async () => {
    const { store, service } = serviceWith();
    await service.approve(tenant, input);
    await service.approve(tenant, input);

    expect(store.queuedJobs).toHaveLength(1);
    expect(store.publishedJobs).toEqual(store.queuedJobs);
  });
});
