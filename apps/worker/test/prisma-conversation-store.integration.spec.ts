import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabaseClient, type DatabaseClient } from "@saas-lead/database";
import { NormalizeInboundProcessor } from "../src/processors/normalize-inbound.processor.js";
import { PrismaConversationStore } from "../src/processors/prisma-conversation.store.js";

const databaseUrl = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/saas_lead";
const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const numberId = randomUUID();
const webhookEventId = randomUUID();

describe("PrismaConversationStore", () => {
  let database: DatabaseClient;

  beforeAll(async () => {
    database = createDatabaseClient(databaseUrl);
    await database.organization.createMany({ data: [
      { id: organizationId, name: "System tenant", slug: `system-${organizationId}` },
      { id: otherOrganizationId, name: "Other tenant", slug: `other-${otherOrganizationId}` },
    ] });
    const accountId = randomUUID();
    await database.whatsAppAccount.create({ data: { id: accountId, organizationId, externalAccountId: `waba-${organizationId}`, credentialReference: "vault://meta/system" } });
    await database.whatsAppNumber.create({ data: { id: numberId, organizationId, accountId, externalNumberId: `phone-${organizationId}` } });
    await database.webhookEvent.create({ data: {
      id: webhookEventId,
      organizationId,
      numberId,
      externalId: `wamid-${organizationId}`,
      payload: { entry: [{ changes: [{ value: { contacts: [{ wa_id: "5511999999999", profile: { name: "Cliente" } }], messages: [{ id: `wamid-${organizationId}`, from: "5511999999999", timestamp: "1790852400", text: { body: "Quero retomar a proposta" }, type: "text" }] } }] }] },
    } });
  });

  afterAll(async () => {
    await database.organization.deleteMany({ where: { id: { in: [organizationId, otherOrganizationId] } } });
    await database.$disconnect();
  });

  it("persists one contact, conversation and message when a job is redelivered", async () => {
    const processor = new NormalizeInboundProcessor(new PrismaConversationStore(database));

    const first = await processor.process({ webhookEventId, organizationId });
    const repeated = await processor.process({ webhookEventId, organizationId });

    expect(repeated).toEqual(first);
    await expect(database.contact.count({ where: { organizationId } })).resolves.toBe(1);
    await expect(database.conversation.count({ where: { organizationId } })).resolves.toBe(1);
    await expect(database.message.count({ where: { organizationId } })).resolves.toBe(1);
    await expect(database.webhookEvent.findUnique({ where: { id: webhookEventId }, select: { status: true, attempts: true } })).resolves.toEqual({ status: "PROCESSED", attempts: 2 });
  });

  it("does not load a webhook through another tenant", async () => {
    const store = new PrismaConversationStore(database);

    await expect(store.loadWebhookForTenant(webhookEventId, otherOrganizationId)).resolves.toBeUndefined();
  });
});
