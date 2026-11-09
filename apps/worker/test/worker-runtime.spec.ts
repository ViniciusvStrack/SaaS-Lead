import { describe, expect, it } from "vitest";
import type { OpportunityCandidate, OrganizationId } from "@saas-lead/contracts";
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
  it("enqueues normalized conversations, routes analysis and rejects malformed queue data", async () => {
    const received: unknown[] = [];
    const analyses: unknown[] = [];
    const enqueued: unknown[] = [];
    const scheduled: unknown[] = [];
    const analysisResult = {
      analysis: { intent: "PURCHASE" as const, stage: "READY_TO_BUY" as const, sentiment: "NEUTRAL" as const, urgency: 0.7, summary: "Lead pronto.", suggestedNextAction: "Responder.", commercial: { discountRequested: false, discountAllowed: false, allowedDiscountPercent: null } },
      cached: false,
      lastInboundAt: new Date("2026-10-01T12:00:00.000Z"),
    };
    const snapshot = {
      conversationId: "conversation-1",
      organizationId: "org-a" as OrganizationId,
      contactId: "contact-1",
      lastMessageBody: "Olá",
      lastMessageAt: new Date("2026-10-01T12:00:00.000Z")
    };
    const handlers = createWorkerHandlers(
      { process: async (job) => { received.push(job); return snapshot; } },
      { process: async (job) => { analyses.push(job); return analysisResult; } },
      { add: async (job) => { enqueued.push(job); } },
      { schedule: async (job, dueAt) => { scheduled.push({ job, dueAt }); } },
      { process: async () => [] },
      { process: async () => undefined },
    );

    await expect(handlers["webhook.normalize"]!({ webhookEventId: "webhook-1", organizationId: "org-a" })).resolves.toEqual(snapshot);
    await expect(handlers["conversation.analyze"]!({ conversationId: "conversation-1", organizationId: "org-a", sourceWebhookEventId: "webhook-1" })).resolves.toEqual(analysisResult);
    await expect(handlers["webhook.normalize"]!({ webhookEventId: "webhook-1" })).rejects.toThrow();
    expect(received).toEqual([{ webhookEventId: "webhook-1", organizationId: "org-a" }]);
    expect(enqueued).toEqual([{ conversationId: "conversation-1", organizationId: "org-a", sourceWebhookEventId: "webhook-1" }]);
    expect(analyses).toEqual([{ conversationId: "conversation-1", organizationId: "org-a", sourceWebhookEventId: "webhook-1" }]);
    expect(scheduled).toEqual([{ job: { conversationId: "conversation-1", organizationId: "org-a", sourceWebhookEventId: "webhook-1" }, dueAt: new Date("2026-10-01T16:00:00.000Z") }]);
  });

  it("generates a suggestion only after an opportunity is detected", async () => {
    const suggested: unknown[] = [];
    const candidate: OpportunityCandidate = {
      deduplicationKey: "dedup-1",
      organizationId: "org-a",
      conversationId: "conversation-1",
      type: "COMPANY_NO_RESPONSE",
      priority: "URGENT",
      knownValue: null,
      evidence: ["sem resposta"],
      ruleVersion: "opportunity-rules.v1",
    };
    const handlers = createWorkerHandlers(
      { process: async () => { throw new Error("not used"); } },
      { process: async () => { throw new Error("not used"); } },
      { add: async () => undefined },
      { schedule: async () => undefined },
      { process: async () => [candidate] },
      { process: async (job) => { suggested.push(job); return { id: "suggestion-1", content: "Responder agora", cached: false }; } },
    );

    await expect(
      handlers["opportunity.detect"]!({ conversationId: "conversation-1", organizationId: "org-a", sourceWebhookEventId: "webhook-1" }),
    ).resolves.toEqual({
      candidates: [candidate],
      suggestion: { id: "suggestion-1", content: "Responder agora", cached: false },
    });
    expect(suggested).toEqual([{ organizationId: "org-a", conversationId: "conversation-1" }]);
  });
});
