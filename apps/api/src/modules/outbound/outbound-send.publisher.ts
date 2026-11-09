import { createHash } from "node:crypto";
import { Queue } from "bullmq";

export const messageSendQueue = "message.send" as const;

export interface SendQueueJob {
  queue: "message.send";
  outboundMessageId: string;
  organizationId: string;
}

export interface SendQueueLike {
  add(name: string, data: unknown, options: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
}

/**
 * Deterministic job id per tenant + outbound message: a redelivered approval
 * never enqueues twice, and re-publishing recovers an enqueue that failed.
 */
export function sendJobId(job: SendQueueJob): string {
  return createHash("sha256").update(`${messageSendQueue}:${job.organizationId}:${job.outboundMessageId}`).digest("hex");
}

export interface SendQueuePublisher {
  publish(job: SendQueueJob): Promise<void>;
  close(): Promise<void>;
}

export class BullMqSendQueue implements SendQueuePublisher {
  private readonly queue: Queue<SendQueueJob>;

  constructor(redisUrl: string, queue?: SendQueueLike) {
    if (!redisUrl) throw new Error("REDIS_URL is required to publish message.send");
    this.queue = queue ? ({ add: queue.add.bind(queue), close: queue.close.bind(queue) } as unknown as Queue<SendQueueJob>) : new Queue<SendQueueJob>(messageSendQueue, {
      connection: { url: redisUrl, maxRetriesPerRequest: null },
      prefix: "saas-lead",
    });
  }

  async publish(job: SendQueueJob): Promise<void> {
    await this.queue.add(messageSendQueue, job, {
      jobId: sendJobId(job),
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
