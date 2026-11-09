import { createHash } from "node:crypto";
import { Queue } from "bullmq";

export const outboundReconcileQueue = "message.reconcile" as const;

export interface ReconcileQueueJob {
  queue: "message.reconcile";
  outboundMessageId: string;
  organizationId: string;
  externalEventId: string;
  status: string;
}

export interface ReconcileQueueLike {
  add(name: string, data: unknown, options: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
}

/**
 * Deterministic job id per tenant + external event: a redelivered status
 * from Meta never enqueues twice, and re-publishing recovers an enqueue that failed.
 */
export function reconcileJobId(job: ReconcileQueueJob): string {
  return createHash("sha256")
    .update(`${outboundReconcileQueue}:${job.organizationId}:${job.externalEventId}`)
    .digest("hex");
}

export interface ReconcileQueuePublisher {
  publish(job: ReconcileQueueJob): Promise<void>;
  close(): Promise<void>;
}

export class BullMqReconcileQueue implements ReconcileQueuePublisher {
  private readonly queue: Queue<ReconcileQueueJob>;

  constructor(redisUrl: string, queue?: ReconcileQueueLike) {
    if (!redisUrl) throw new Error("REDIS_URL is required to publish message.reconcile");
    this.queue = queue
      ? ({ add: queue.add.bind(queue), close: queue.close.bind(queue) } as unknown as Queue<ReconcileQueueJob>)
      : new Queue<ReconcileQueueJob>(outboundReconcileQueue, {
          connection: { url: redisUrl, maxRetriesPerRequest: null },
          prefix: "saas-lead",
        });
  }

  async publish(job: ReconcileQueueJob): Promise<void> {
    await this.queue.add(outboundReconcileQueue, job, {
      jobId: reconcileJobId(job),
      attempts: 5,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    });
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
