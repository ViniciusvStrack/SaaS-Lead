import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createTenantContext } from "../../packages/database/src/tenant-context.js";
import { PolicyEngine } from "../../packages/policy/src/policy-engine.js";
import { WebhookInbox, InMemoryInboxStore, InMemoryNumberDirectory } from "../../apps/api/src/modules/webhooks/webhook-inbox.js";
import { OutboundApprovalService, InMemoryOutboundStore } from "../../apps/api/src/modules/outbound/outbound-approval.service.js";
import { OpportunityEngine } from "../../apps/api/src/modules/opportunities/opportunity.engine.js";
import { AnalyticsService } from "../../apps/api/src/modules/analytics/analytics.service.js";
import { AnalyzeConversationProcessor, InMemoryAnalysisStore } from "../../apps/worker/src/processors/analyze-conversation.processor.js";
import { InMemoryConversationStore } from "../../apps/worker/src/processors/in-memory-conversation.store.js";
import { NormalizeInboundProcessor } from "../../apps/worker/src/processors/normalize-inbound.processor.js";
import { GenerateSuggestionProcessor } from "../../apps/worker/src/processors/generate-suggestion.processor.js";
import { InMemorySendStore, SendMessageProcessor } from "../../apps/worker/src/processors/send-message.processor.js";
import { ReconcileMessageProcessor } from "../../apps/worker/src/processors/reconcile-message.processor.js";

describe("controlled staging critical cycle", () => {
  it("moves one tenant from verified webhook to evidence-backed commercial result", async () => {
    const deployment = JSON.parse(await readFile("infra/deploy/staging.contract.json", "utf8")) as Record<string, unknown>;
    expect(deployment).toMatchObject({ status: "DECLARED_NOT_PROVISIONED", tls: true, managedDatabase: true, managedRedis: true, secretsManager: true, backups: true, rollback: true, productionApproved: false });

    const organizationId = "org-system-a";
    const tenant = createTenantContext({ organizationId, userId: "owner-system-a", role: "OWNER" });
    const secret = "system-test-secret";
    const rawBody = Buffer.from(JSON.stringify({ entry: [{ id: "entry-1", changes: [{ value: { metadata: { phone_number_id: "phone-1" }, messages: [{ id: "wamid-1" }] } }] }] }));
    const signature = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
    const inboxStore = new InMemoryInboxStore();
    const accepted = await new WebhookInbox(secret, new InMemoryNumberDirectory({ "phone-1": organizationId }), inboxStore).accept(rawBody, signature);
    expect(accepted).toEqual({ accepted: true, duplicate: false });

    const receivedAt = new Date("2026-10-01T10:00:00Z");
    const conversationStore = new InMemoryConversationStore([
      { id: "webhook-1", externalId: "wamid-1", organizationId, phoneNumberId: "phone-1", senderId: "contact-1", senderName: "Cliente", messageId: "wamid-1", body: "Recebi a proposta de R$ 4.900", occurredAt: receivedAt },
      { id: "webhook-2", externalId: "wamid-2", organizationId, phoneNumberId: "phone-1", senderId: "contact-1", messageId: "wamid-2", body: "Fechado, pode prosseguir", occurredAt: new Date("2026-10-03T12:00:00Z") },
    ]);
    const normalize = new NormalizeInboundProcessor(conversationStore);
    const conversation = await normalize.process({ webhookEventId: "webhook-1", organizationId });

    const analysisStore = new InMemoryAnalysisStore();
    const analyze = new AnalyzeConversationProcessor({ analyzeConversation: async () => ({ analysis: { intent: "PURCHASE", stage: "PROPOSAL", sentiment: "POSITIVE", urgency: 0.8, summary: "Cliente avaliando proposta.", suggestedNextAction: "Retomar proposta.", commercial: { discountRequested: false, discountAllowed: false, allowedDiscountPercent: null } }, usage: { inputTokens: 20, outputTokens: 10 } }) }, analysisStore, "fake-system-model");
    const analyzed = await analyze.process({ organizationId, conversationId: conversation.conversationId, messages: [{ direction: "INBOUND", body: conversation.lastMessageBody, occurredAt: receivedAt.toISOString() }], businessSettings: {}, promptVersion: "system-v1" });

    const opportunity = new OpportunityEngine().detect({ organizationId, conversationId: conversation.conversationId, analysis: analyzed.analysis, quoteSentAt: receivedAt, now: new Date("2026-10-03T11:00:00Z"), quotedAmount: 4900 })[0];
    expect(opportunity?.type).toBe("QUOTE_ABANDONED");
    const suggestion = await new GenerateSuggestionProcessor({ generate: async () => ({ content: "Olá! Posso ajudar com alguma dúvida sobre a proposta?" }) }).process({ organizationId, opportunityId: opportunity!.deduplicationKey });

    const outboundStore = new InMemoryOutboundStore();
    const approved = await new OutboundApprovalService(outboundStore, new PolicyEngine()).approve(tenant, { conversationId: conversation.conversationId, opportunityId: opportunity!.deduplicationKey, content: suggestion.content, idempotencyKey: "system-send-1", context: { consentStatus: "GRANTED", optedOut: false, withinCustomerCareWindow: true, templateStatus: undefined, cooldownSatisfied: true, accountActive: true } });
    expect(approved.status).toBe("APPROVED");

    const sendStore = new InMemorySendStore([{ id: approved.id, organizationId, phoneNumberId: "phone-1", to: "5511999999999", content: approved.content, contentHash: approved.contentHash, approvedContentHash: approved.contentHash, idempotencyKey: approved.idempotencyKey, status: "APPROVED", context: { consentStatus: "GRANTED", optedOut: false, withinCustomerCareWindow: true, templateStatus: undefined, cooldownSatisfied: true, accountActive: true, actorCanApprove: true } }]);
    await new SendMessageProcessor(sendStore, { send: async () => ({ messageId: "meta-system-1" }) }, new PolicyEngine()).process({ organizationId, outboundMessageId: approved.id });
    new ReconcileMessageProcessor(sendStore).process({ organizationId, externalMessageId: "meta-system-1", externalEventId: "status-system-1", status: "DELIVERED" });
    expect(sendStore.get(approved.id)?.status).toBe("DELIVERED");

    const reply = await normalize.process({ webhookEventId: "webhook-2", organizationId });
    expect(reply.lastMessageBody).toBe("Fechado, pode prosseguir");
    const result = new AnalyticsService().summarize(organizationId, [{ organizationId, opportunityId: opportunity!.deduplicationKey, status: "WON", knownValue: 4900, evidence: { source: "CUSTOMER_CONFIRMATION", referenceId: "wamid-2" } }]);
    expect(result).toMatchObject({ attributedConversions: 1, attributedRevenue: 4900 });
  });
});
