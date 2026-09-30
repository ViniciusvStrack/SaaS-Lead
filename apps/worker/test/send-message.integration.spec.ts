import { describe, expect, it } from "vitest";
import { PolicyEngine } from "@saas-lead/policy";
import { InMemorySendStore, SendMessageProcessor } from "../src/processors/send-message.processor.js";
import { ReconcileMessageProcessor } from "../src/processors/reconcile-message.processor.js";

const approved = { id: "out-1", organizationId: "org-a", phoneNumberId: "phone-1", to: "5511999999999", content: "Olá", contentHash: "hash-a", approvedContentHash: "hash-a", idempotencyKey: "send-1", status: "APPROVED" as const, context: { consentStatus: "GRANTED" as const, optedOut: false, withinCustomerCareWindow: true, templateStatus: undefined, cooldownSatisfied: true, accountActive: true, actorCanApprove: true } };

describe("send message", () => {
  it("não envia conteúdo editado após aprovação", async () => {
    const store = new InMemorySendStore([{ ...approved, contentHash: "hash-b" }]);
    const provider = { calls: 0, async send() { this.calls++; return { messageId: "meta-1" }; } };
    await new SendMessageProcessor(store, provider, new PolicyEngine()).process({ organizationId: "org-a", outboundMessageId: "out-1" });
    expect(provider.calls).toBe(0);
    expect(store.get("out-1")?.status).toBe("BLOCKED");
  });
  it("mantém envio pendente quando o provider sofre timeout", async () => {
    const store = new InMemorySendStore([approved]);
    const provider = { async send() { throw new Error("provider timeout"); } };
    await expect(new SendMessageProcessor(store, provider, new PolicyEngine()).process({ organizationId: "org-a", outboundMessageId: "out-1" })).rejects.toThrow("provider timeout");
    expect(store.get("out-1")?.status).toBe("APPROVED");
  });
  it("ignora webhook de status duplicado", () => {
    const store = new InMemorySendStore([{ ...approved, status: "SENT", externalMessageId: "meta-1" }]);
    const processor = new ReconcileMessageProcessor(store);
    processor.process({ organizationId: "org-a", externalMessageId: "meta-1", externalEventId: "evt-1", status: "DELIVERED" });
    processor.process({ organizationId: "org-a", externalMessageId: "meta-1", externalEventId: "evt-1", status: "DELIVERED" });
    expect(store.events).toHaveLength(1);
    expect(store.get("out-1")?.status).toBe("DELIVERED");
  });
});
