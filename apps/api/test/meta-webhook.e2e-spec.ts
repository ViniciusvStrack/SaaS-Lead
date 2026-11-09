import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InMemoryInboxStore, InMemoryNumberDirectory, WebhookInbox } from "../src/modules/webhooks/webhook-inbox.js";
import { verifyMetaChallenge } from "../src/modules/webhooks/meta-verification.js";
import type { NormalizeQueuePublisher, NormalizeWebhookJob } from "../src/modules/webhooks/webhook-normalize.publisher.js";
import { WebhooksController } from "../src/modules/webhooks/webhooks.controller.js";

const secret = "secret";
const payload = Buffer.from(JSON.stringify({ entry: [{ id: "entry-1", changes: [{ value: { metadata: { phone_number_id: "phone-1" }, messages: [{ id: "message-1" }] } }] }] }));
const sign = (body: Buffer) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

function createController() {
  const published: NormalizeWebhookJob[] = [];
  const publisher: NormalizeQueuePublisher = {
    publish: async (job) => { published.push(job); },
    close: async () => undefined,
  };
  const inbox = new WebhookInbox(secret, new InMemoryNumberDirectory({ "phone-1": "org-a" }), new InMemoryInboxStore());
  const controller = new WebhooksController(inbox, "verify", publisher);
  return { controller, published };
}

describe("Meta webhook inbox", () => {
  it("returns the challenge only for the configured token", () => {
    expect(verifyMetaChallenge({ "hub.mode": "subscribe", "hub.verify_token": "verify", "hub.challenge": "42" }, "verify")).toBe("42");
    expect(() => verifyMetaChallenge({ "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "42" }, "verify")).toThrow();
  });

  it.each([
    [Buffer.from("{}"), "sha256=bad", "invalid_signature"],
    [Buffer.from("not-json"), sign(Buffer.from("not-json")), "malformed_payload"],
    [Buffer.alloc(1025), sign(Buffer.alloc(1025)), "payload_too_large"],
  ])("rejects unsafe input", async (body, signature, reason) => {
    const inbox = new WebhookInbox(secret, new InMemoryNumberDirectory({ "phone-1": "org-a" }), new InMemoryInboxStore(), 1024);
    await expect(inbox.accept(body, signature)).resolves.toEqual({ accepted: false, reason });
  });

  it("persists one processable row for duplicate deliveries", async () => {
    const store = new InMemoryInboxStore();
    const inbox = new WebhookInbox(secret, new InMemoryNumberDirectory({ "phone-1": "org-a" }), store);
    const first = await inbox.accept(payload, sign(payload));
    const second = await inbox.accept(payload, sign(payload));

    expect(first).toMatchObject({ accepted: true, duplicate: false, organizationId: "org-a" });
    expect(second).toMatchObject({ accepted: true, duplicate: true, organizationId: "org-a" });
    expect(store.events.size).toBe(1);
    if (first.accepted && second.accepted) expect(second.eventId).toBe(first.eventId);
  });

  it("rejects a number that is not associated with a tenant", async () => {
    const inbox = new WebhookInbox(secret, new InMemoryNumberDirectory({}), new InMemoryInboxStore());
    await expect(inbox.accept(payload, sign(payload))).resolves.toEqual({ accepted: false, reason: "unknown_phone_number" });
  });
});

describe("WebhooksController", () => {
  it("enqueues webhook.normalize with the persisted event id", async () => {
    const { controller, published } = createController();

    const result = await controller.receive({ rawBody: payload }, sign(payload));

    expect(result).toMatchObject({ accepted: true, duplicate: false, organizationId: "org-a" });
    expect(published).toHaveLength(1);
    expect(published[0]).toEqual({
      webhookEventId: result.accepted ? result.eventId : "",
      organizationId: "org-a",
    });
  });

  it("does not enqueue a rejected delivery", async () => {
    const { controller, published } = createController();

    const result = await controller.receive({ rawBody: payload }, "sha256=bad");

    expect(result).toEqual({ accepted: false, reason: "invalid_signature" });
    expect(published).toHaveLength(0);
  });

  it("re-publishes a duplicate with the same event id so a failed first enqueue can recover", async () => {
    const { controller, published } = createController();

    const first = await controller.receive({ rawBody: payload }, sign(payload));
    const second = await controller.receive({ rawBody: payload }, sign(payload));

    expect(published).toHaveLength(2);
    expect(published[0]).toEqual(published[1]);
    expect(second).toMatchObject({ accepted: true, duplicate: true });
    if (first.accepted && second.accepted) expect(second.eventId).toBe(first.eventId);
  });
});
