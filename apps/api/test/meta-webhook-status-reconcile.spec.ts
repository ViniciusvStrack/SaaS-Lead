import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InMemoryInboxStore, InMemoryNumberDirectory, WebhookInbox } from "../src/modules/webhooks/webhook-inbox.js";
import type { DatabaseClient } from "@saas-lead/database";
import type { NormalizeQueuePublisher, NormalizeWebhookJob } from "../src/modules/webhooks/webhook-normalize.publisher.js";
import type { ReconcileQueuePublisher, ReconcileQueueJob } from "../src/modules/webhooks/../outbound/outbound-reconcile.publisher.js";
import { WebhooksController } from "../src/modules/webhooks/webhooks.controller.js";

const secret = "secret";
const sign = (body: Buffer) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

function makePayload(value: unknown): Buffer {
  return Buffer.from(JSON.stringify({ entry: [{ id: "entry-1", changes: [{ value }] }] }));
}

const statusPayload = makePayload({
  metadata: { phone_number_id: "phone-1" },
  statuses: [{ id: "wamid-out", message_id: "wamid-msg", status: "delivered" }],
});

const messagePayload = makePayload({
  metadata: { phone_number_id: "phone-1" },
  messages: [{ id: "msg-1" }],
});

const emptyPayload = makePayload({ metadata: { phone_number_id: "phone-1" } });

describe("extractIdentity with statuses", () => {
  it("aceita payload com statuses, retornando externalId e externalMessageId", async () => {
    const store = new InMemoryInboxStore();
    const inbox = new WebhookInbox(secret, new InMemoryNumberDirectory({ "phone-1": "org-a" }), store);

    const result = await inbox.accept(statusPayload, sign(statusPayload));

    expect(result).toMatchObject({ accepted: true, organizationId: "org-a" });
    if (result.accepted) {
      const event = store.events.get("wamid-out");
      expect(event).toBeDefined();
      expect(event?.externalId).toBe("wamid-out");
      expect(event?.externalMessageId).toBe("wamid-msg");
    }
    expect(store.events.size).toBe(1);
  });

  it("rejeita payload sem messages nem statuses", async () => {
    const store = new InMemoryInboxStore();
    const inbox = new WebhookInbox(secret, new InMemoryNumberDirectory({ "phone-1": "org-a" }), store);

    const result = await inbox.accept(emptyPayload, sign(emptyPayload));

    expect(result).toEqual({ accepted: false, reason: "unsupported_payload" });
    expect(store.events.size).toBe(0);
  });
});

describe("WebhooksController status reconciliation", () => {
  function createController() {
    const normalizePublished: NormalizeWebhookJob[] = [];
    const reconcilePublished: ReconcileQueueJob[] = [];
    const normalizePublisher: NormalizeQueuePublisher = {
      publish: async (job) => { normalizePublished.push(job); },
      close: async () => undefined,
    };
    const reconcilePublisher: ReconcileQueuePublisher = {
      publish: async (job) => { reconcilePublished.push(job); },
      close: async () => undefined,
    };
    const inbox = new WebhookInbox(secret, new InMemoryNumberDirectory({ "phone-1": "org-a" }), new InMemoryInboxStore());
    const controller = new WebhooksController(inbox, "verify", normalizePublisher, reconcilePublisher, {
      outboundMessage: {
        findFirst: async () => undefined,
      },
    } as unknown as DatabaseClient);
    return { controller, normalizePublished, reconcilePublished };
  }

  function createControllerWithOutbound(found: { id: string } | undefined) {
    const normalizePublished: NormalizeWebhookJob[] = [];
    const reconcilePublished: ReconcileQueueJob[] = [];
    const normalizePublisher: NormalizeQueuePublisher = {
      publish: async (job) => { normalizePublished.push(job); },
      close: async () => undefined,
    };
    const reconcilePublisher: ReconcileQueuePublisher = {
      publish: async (job) => { reconcilePublished.push(job); },
      close: async () => undefined,
    };
    const inbox = new WebhookInbox(secret, new InMemoryNumberDirectory({ "phone-1": "org-a" }), new InMemoryInboxStore());
    const controller = new WebhooksController(inbox, "verify", normalizePublisher, reconcilePublisher, {
      outboundMessage: {
        findFirst: async () => found,
      },
    } as unknown as DatabaseClient);
    return { controller, normalizePublished, reconcilePublished };
  }

  it("publica message.reconcile quando payload tem statuses e outboundMessage encontrado", async () => {
    const { controller, reconcilePublished, normalizePublished } = createControllerWithOutbound({ id: "outbound-1" });

    const result = await controller.receive({ rawBody: statusPayload }, sign(statusPayload));

    expect(result).toMatchObject({ accepted: true, organizationId: "org-a" });
    expect(reconcilePublished).toHaveLength(1);
    expect(reconcilePublished[0]).toEqual({
      queue: "message.reconcile",
      outboundMessageId: "outbound-1",
      organizationId: "org-a",
      externalEventId: result.accepted ? result.eventId : "",
      status: "delivered",
    });
    expect(normalizePublished).toHaveLength(0);
  });

  it("não publica message.reconcile quando payload tem messages (só webhook.normalize)", async () => {
    const { controller, reconcilePublished, normalizePublished } = createController();

    const result = await controller.receive({ rawBody: messagePayload }, sign(messagePayload));

    expect(result).toMatchObject({ accepted: true, organizationId: "org-a" });
    expect(reconcilePublished).toHaveLength(0);
    expect(normalizePublished).toHaveLength(1);
    expect(normalizePublished[0]).toEqual({
      webhookEventId: result.accepted ? result.eventId : "",
      organizationId: "org-a",
    });
  });

  it("não publica message.reconcile quando outboundMessage não encontrado", async () => {
    const { controller, reconcilePublished } = createController();

    const result = await controller.receive({ rawBody: statusPayload }, sign(statusPayload));

    expect(result).toMatchObject({ accepted: true, organizationId: "org-a" });
    expect(reconcilePublished).toHaveLength(0);
  });
});
