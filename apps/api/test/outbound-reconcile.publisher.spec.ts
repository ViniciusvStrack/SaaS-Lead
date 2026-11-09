import { describe, expect, it } from "vitest";

import {
  BullMqReconcileQueue,
  outboundReconcileQueue,
  reconcileJobId,
  type ReconcileQueueLike,
} from "../src/modules/outbound/outbound-reconcile.publisher.js";

const job = {
  queue: "message.reconcile" as const,
  outboundMessageId: "out-1",
  organizationId: "org-a",
  externalEventId: "evt-1",
  status: "DELIVERED",
};

describe("BullMqReconcileQueue", () => {
  it("usa jobId determinístico por organização e evento externo", () => {
    expect(reconcileJobId(job)).toBe(reconcileJobId({ ...job }));
    expect(reconcileJobId(job)).not.toBe(
      reconcileJobId({ ...job, organizationId: "org-b" }),
    );
    expect(reconcileJobId(job)).not.toBe(
      reconcileJobId({ ...job, externalEventId: "evt-2" }),
    );
  });

  it("publica na fila message.reconcile com jobId, attempts 5, removeOnComplete 1000, removeOnFail 5000", async () => {
    const calls: Array<{ name: string; data: unknown; options: Record<string, unknown> }> = [];
    const queue: ReconcileQueueLike = {
      add: async (name, data, options) => {
        calls.push({ name, data, options });
      },
      close: async () => undefined,
    };
    const publisher = new BullMqReconcileQueue("redis://localhost:6379", queue);

    await publisher.publish(job);

    expect(calls).toEqual([
      {
        name: outboundReconcileQueue,
        data: job,
        options: expect.objectContaining({
          jobId: reconcileJobId(job),
          attempts: 5,
          removeOnComplete: 1_000,
          removeOnFail: 5_000,
        }),
      },
    ]);
  });

  it("falha fechado sem REDIS_URL", () => {
    expect(() => new BullMqReconcileQueue("")).toThrow("REDIS_URL");
  });
});
