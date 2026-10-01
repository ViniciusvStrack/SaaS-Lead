import { describe, expect, it } from "vitest";
import type { OrganizationId } from "@saas-lead/contracts";
import { WorkerRuntime, type QueueWorkerFactory } from "../src/worker-runtime.js";
import { createWorkerHandlers } from "../src/worker-handlers.js";

describe("WorkerRuntime", () => {
  it("registers typed handlers and closes every consumer gracefully", async () => {
    const registered: Array<{ queue: string; process: (data: unknown) => Promise<unknown> }> = [];
    const closed: string[] = [];
    const factory: QueueWorkerFactory = (queue, process) => {
      registered.push({ queue, process });
      return { close: async () => { closed.push(queue); }, onError: () => undefined };
    };
    const runtime = new WorkerRuntime(factory, {
      "webhook.normalize": async (data) => ({ accepted: (data as { webhookEventId: string }).webhookEventId }),
      "message.send": async () => ({ sent: true }),
    });

    runtime.start();
    expect(registered.map(({ queue }) => queue)).toEqual(["webhook.normalize", "message.send"]);
    await expect(registered[0]!.process({ webhookEventId: "webhook-1" })).resolves.toEqual({ accepted: "webhook-1" });
    await runtime.close();
    await runtime.close();
    expect(closed).toEqual(["webhook.normalize", "message.send"]);
  });

  it("logs queue failures without job payloads or credentials", () => {
    const errors: Array<Record<string, unknown>> = [];
    let report: ((error: Error) => void) | undefined;
    const factory: QueueWorkerFactory = () => ({ close: async () => undefined, onError: (listener) => { report = listener; } });
    const runtime = new WorkerRuntime(factory, { "webhook.normalize": async () => undefined }, (entry) => errors.push(entry));

    runtime.start();
    report?.(new Error("redis://user:secret@cache message body"));

    expect(errors).toEqual([{ queue: "webhook.normalize", errorType: "Error" }]);
    expect(JSON.stringify(errors)).not.toContain("secret");
    expect(JSON.stringify(errors)).not.toContain("message body");
  });
});

describe("createWorkerHandlers", () => {
  it("routes a valid normalize job and rejects malformed queue data", async () => {
    const received: unknown[] = [];
    const snapshot = {
      conversationId: "conversation-1",
      organizationId: "org-a" as OrganizationId,
      contactId: "contact-1",
      lastMessageBody: "Olá",
      lastMessageAt: new Date("2026-10-01T12:00:00.000Z")
    };
    const handlers = createWorkerHandlers({ process: async (job) => { received.push(job); return snapshot; } });

    await expect(handlers["webhook.normalize"]!({ webhookEventId: "webhook-1", organizationId: "org-a" })).resolves.toEqual(snapshot);
    await expect(handlers["webhook.normalize"]!({ webhookEventId: "webhook-1" })).rejects.toThrow();
    expect(received).toEqual([{ webhookEventId: "webhook-1", organizationId: "org-a" }]);
  });
});
