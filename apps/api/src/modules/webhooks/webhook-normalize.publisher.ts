import { createHash } from "node:crypto";
import { Queue } from "bullmq";

/** Mirrors `apps/worker/src/queues/webhook-normalize.queue.ts`. */
export const webhookNormalizeQueue = "webhook.normalize" as const;

export interface NormalizeWebhookJob {
  webhookEventId: string;
  organizationId: string;
}

export interface NormalizeQueuePublisher {
  publish(job: NormalizeWebhookJob): Promise<void>;
  close(): Promise<void>;
}

/**
 * Publishes the first pipeline step after a Meta webhook is persisted.
 * The job id is deterministic so a redelivered webhook never enqueues twice.
 */
export class BullMqNormalizeQueue implements NormalizeQueuePublisher {
  private readonly queue: Queue<NormalizeWebhookJob>;

  constructor(redisUrl: string) {
    if (!redisUrl) throw new Error("REDIS_URL is required to publish webhook.normalize");
    this.queue = new Queue<NormalizeWebhookJob>(webhookNormalizeQueue, {
      connection: { url: redisUrl, maxRetriesPerRequest: null },
      prefix: "saas-lead",
    });
  }

  async publish(job: NormalizeWebhookJob): Promise<void> {
    const jobId = createHash("sha256")
      .update(`${webhookNormalizeQueue}:${job.organizationId}:${job.webhookEventId}`)
      .digest("hex");
    await this.queue.add(webhookNormalizeQueue, job, {
      jobId,
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
