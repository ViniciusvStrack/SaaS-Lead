import { describe, expect, it } from "vitest";

import { deterministicJobId, toDeadLetter } from "../src/queues/webhook-normalize.queue.js";
import {
  InMemoryConversationStore,
  type StoredWebhookEvent,
} from "../src/processors/in-memory-conversation.store.js";
import { NormalizeInboundProcessor } from "../src/processors/normalize-inbound.processor.js";

const event = (overrides: Partial<StoredWebhookEvent> = {}): StoredWebhookEvent => ({
  id: "webhook-1",
  externalId: "wamid-1",
  organizationId: "org-a",
  phoneNumberId: "phone-1",
  senderId: "5511999999999",
  senderName: "Cliente",
  messageId: "wamid-1",
  body: "Olá",
  occurredAt: new Date("2026-09-30T12:00:00Z"),
  ...overrides,
});

describe("NormalizeInboundProcessor", () => {
  it("creates an auditable dead-letter without exposing an error stack", () => {
    expect(
      toDeadLetter(
        { webhookEventId: "webhook-1", organizationId: "org-a" },
        new Error("database unavailable"),
        5,
        new Date("2026-09-30T12:10:00Z"),
      ),
    ).toEqual({
      jobId: "webhook.normalize:org-a:webhook-1",
      queue: "webhook.normalize.dead-letter",
      webhookEventId: "webhook-1",
      organizationId: "org-a",
      attempts: 5,
      reason: "database unavailable",
      failedAt: new Date("2026-09-30T12:10:00Z"),
    });
  });

  it("uses a deterministic queue job id and stores a duplicate delivery once", async () => {
    expect(deterministicJobId("org-a", "webhook-1")).toBe("webhook.normalize:org-a:webhook-1");
    const store = new InMemoryConversationStore([event()]);
    const processor = new NormalizeInboundProcessor(store);

    await processor.process({ webhookEventId: "webhook-1", organizationId: "org-a" });
    await processor.process({ webhookEventId: "webhook-1", organizationId: "org-a" });

    expect(store.messages).toHaveLength(1);
    expect(store.webhookEvents.get("webhook-1")?.status).toBe("PROCESSED");
  });

  it("keeps the newest conversation snapshot when an older event arrives later", async () => {
    const newer = event({ id: "webhook-new", externalId: "wamid-new", messageId: "wamid-new", body: "Nova", occurredAt: new Date("2026-09-30T12:05:00Z") });
    const older = event({ id: "webhook-old", externalId: "wamid-old", messageId: "wamid-old", body: "Antiga", occurredAt: new Date("2026-09-30T12:01:00Z") });
    const store = new InMemoryConversationStore([newer, older]);
    const processor = new NormalizeInboundProcessor(store);

    await processor.process({ webhookEventId: newer.id, organizationId: "org-a" });
    await processor.process({ webhookEventId: older.id, organizationId: "org-a" });

    expect(store.messages.map((message) => message.body).sort()).toEqual(["Antiga", "Nova"]);
    expect(store.conversations[0]).toMatchObject({ lastMessageBody: "Nova", lastMessageAt: newer.occurredAt });
  });

  it("rolls back a partial failure so retry creates exactly one message", async () => {
    const store = new InMemoryConversationStore([event()], { failAfterMessageOnce: true });
    const processor = new NormalizeInboundProcessor(store);

    await expect(processor.process({ webhookEventId: "webhook-1", organizationId: "org-a" })).rejects.toThrow("simulated partial failure");
    expect(store.messages).toHaveLength(0);
    await processor.process({ webhookEventId: "webhook-1", organizationId: "org-a" });

    expect(store.messages).toHaveLength(1);
    expect(store.webhookEvents.get("webhook-1")?.attempts).toBe(2);
  });

  it("rejects a job whose tenant differs from the persisted webhook", async () => {
    const store = new InMemoryConversationStore([event()]);
    const processor = new NormalizeInboundProcessor(store);

    await expect(processor.process({ webhookEventId: "webhook-1", organizationId: "org-b" })).rejects.toThrow("Webhook event not found");
    expect(store.contacts).toHaveLength(0);
    expect(store.messages).toHaveLength(0);
  });

  it("upserts one contact and conversation under concurrent events", async () => {
    const second = event({ id: "webhook-2", externalId: "wamid-2", messageId: "wamid-2", body: "Preciso de ajuda", occurredAt: new Date("2026-09-30T12:01:00Z") });
    const store = new InMemoryConversationStore([event(), second]);
    const processor = new NormalizeInboundProcessor(store);

    await Promise.all([
      processor.process({ webhookEventId: "webhook-1", organizationId: "org-a" }),
      processor.process({ webhookEventId: "webhook-2", organizationId: "org-a" }),
    ]);

    expect(store.contacts).toHaveLength(1);
    expect(store.conversations).toHaveLength(1);
    expect(store.messages).toHaveLength(2);
  });
});
