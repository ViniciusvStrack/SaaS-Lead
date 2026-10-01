import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createDatabaseClient } from "@saas-lead/database";
import { PrismaOpportunityRuntime } from "../src/processors/prisma-opportunity.runtime.js";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("TEST_DATABASE_URL or DATABASE_URL is required");
const database = createDatabaseClient(databaseUrl);
afterAll(async () => database.$disconnect());

describe("PrismaOpportunityRuntime", () => {
  it("creates one unanswered commercial opportunity on repeated detection", async () => {
    const suffix = randomUUID();
    const organization = await database.organization.create({ data: { name: "Opportunity tenant", slug: `opportunity-${suffix}` } });
    const account = await database.whatsAppAccount.create({ data: { organizationId: organization.id, externalAccountId: `account-${suffix}`, credentialReference: "secret-ref" } });
    const number = await database.whatsAppNumber.create({ data: { organizationId: organization.id, accountId: account.id, externalNumberId: `number-${suffix}` } });
    const contact = await database.contact.create({ data: { organizationId: organization.id, externalContactId: `contact-${suffix}` } });
    const conversation = await database.conversation.create({ data: { organizationId: organization.id, numberId: number.id, contactId: contact.id } });
    await database.message.create({ data: { organizationId: organization.id, conversationId: conversation.id, externalMessageId: `message-${suffix}`, direction: "INBOUND", body: "Quero contratar", occurredAt: new Date("2026-10-01T08:00:00Z") } });
    await database.aIAnalysis.create({ data: { organizationId: organization.id, conversationId: conversation.id, inputHash: suffix, promptVersion: "local-rules.v1", model: "local-rules.v1", analysis: { intent: "PURCHASE", stage: "READY_TO_BUY", urgency: 0.7 } } });
    const runtime = new PrismaOpportunityRuntime(database, () => new Date("2026-10-01T13:00:00Z"));

    await runtime.process({ organizationId: organization.id, conversationId: conversation.id });
    await runtime.process({ organizationId: organization.id, conversationId: conversation.id });

    const opportunities = await database.opportunity.findMany({ where: { organizationId: organization.id, conversationId: conversation.id }, include: { events: true } });
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]).toMatchObject({ type: "COMPANY_NO_RESPONSE", priority: "URGENT", status: "OPEN", knownValue: null });
    expect(opportunities[0]?.events).toHaveLength(1);
  });

  it("does not create an opportunity for a missing tenant conversation", async () => {
    const runtime = new PrismaOpportunityRuntime(database, () => new Date("2026-10-01T13:00:00Z"));
    await expect(runtime.process({ organizationId: randomUUID(), conversationId: randomUUID() })).rejects.toThrow("Conversation not found");
  });
});
