import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createDatabaseClient } from "@saas-lead/database";
import { PrismaAnalysisRuntime } from "../src/processors/prisma-analysis.runtime.js";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("TEST_DATABASE_URL or DATABASE_URL is required");
const database = createDatabaseClient(databaseUrl);

afterAll(async () => database.$disconnect());

describe("PrismaAnalysisRuntime", () => {
  it("loads tenant context and persists one analysis and usage record across redelivery", async () => {
    const suffix = randomUUID();
    const organization = await database.organization.create({ data: { name: "Analysis tenant", slug: `analysis-${suffix}` } });
    const account = await database.whatsAppAccount.create({ data: { organizationId: organization.id, externalAccountId: `account-${suffix}`, credentialReference: "secret-ref" } });
    const number = await database.whatsAppNumber.create({ data: { organizationId: organization.id, accountId: account.id, externalNumberId: `number-${suffix}` } });
    const contact = await database.contact.create({ data: { organizationId: organization.id, externalContactId: `contact-${suffix}` } });
    const conversation = await database.conversation.create({ data: { organizationId: organization.id, numberId: number.id, contactId: contact.id, lastMessageBody: "Quero comprar", lastMessageAt: new Date("2026-10-01T12:00:00Z") } });
    await database.message.create({ data: { organizationId: organization.id, conversationId: conversation.id, externalMessageId: `message-${suffix}`, direction: "INBOUND", body: "Quero comprar", occurredAt: new Date("2026-10-01T12:00:00Z") } });
    await database.businessSettings.create({ data: { organizationId: organization.id, description: "Venda de serviços", tone: "consultivo", version: 3 } });
    let providerCalls = 0;
    const provider = { analyzeConversation: async () => {
      providerCalls += 1;
      return { analysis: { intent: "PURCHASE" as const, stage: "READY_TO_BUY" as const, sentiment: "POSITIVE" as const, urgency: 0.8, summary: "Lead pronto.", suggestedNextAction: "Apresentar proposta.", commercial: { discountRequested: false, discountAllowed: false, allowedDiscountPercent: null } }, usage: { inputTokens: 80, outputTokens: 20 } };
    } };
    const runtime = new PrismaAnalysisRuntime(database, provider, { model: "commercial-model", promptVersion: "conversation.v1", providerName: "openai" });

    await runtime.process({ organizationId: organization.id, conversationId: conversation.id });
    await runtime.process({ organizationId: organization.id, conversationId: conversation.id });

    expect(providerCalls).toBe(1);
    expect(await database.aIAnalysis.count({ where: { organizationId: organization.id, conversationId: conversation.id } })).toBe(1);
    const usage = await database.usageRecord.findMany({ where: { organizationId: organization.id } });
    expect(usage).toHaveLength(1);
    expect(usage[0]).toMatchObject({ provider: "openai", model: "commercial-model", inputTokens: 80, outputTokens: 20, metric: "ai.tokens", quantity: 100 });
  });

  it("rejects a conversation from another tenant before calling the provider", async () => {
    let called = false;
    const runtime = new PrismaAnalysisRuntime(database, { analyzeConversation: async () => { called = true; throw new Error("must not run"); } }, { model: "commercial-model", promptVersion: "conversation.v1" });
    await expect(runtime.process({ organizationId: randomUUID(), conversationId: randomUUID() })).rejects.toThrow("Conversation not found");
    expect(called).toBe(false);
  });
});
