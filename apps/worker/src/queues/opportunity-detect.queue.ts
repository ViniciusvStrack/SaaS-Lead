import { createHash } from "node:crypto";
import { Queue } from "bullmq";
import type { DetectOpportunityJob } from "../processors/prisma-opportunity.runtime.js";

export const opportunityDetectQueue = "opportunity.detect" as const;
export interface ScheduledOpportunityJob extends DetectOpportunityJob { sourceWebhookEventId: string }
export interface OpportunityQueuePublisher { schedule(job: ScheduledOpportunityJob, dueAt: Date): Promise<void> }

export class BullMqOpportunityQueue implements OpportunityQueuePublisher {
  private readonly queue: Queue<ScheduledOpportunityJob>;
  constructor(redisUrl: string) {
    this.queue = new Queue(opportunityDetectQueue, { connection: { url: redisUrl, maxRetriesPerRequest: null }, prefix: "saas-lead" });
  }
  async schedule(job: ScheduledOpportunityJob, dueAt: Date): Promise<void> {
    const jobId = createHash("sha256").update(`${job.organizationId}:${job.sourceWebhookEventId}`).digest("hex");
    await this.queue.add(opportunityDetectQueue, job, { jobId, delay: Math.max(0, dueAt.getTime() - Date.now()), attempts: 5, backoff: { type: "exponential", delay: 2_000 }, removeOnComplete: 1_000, removeOnFail: 5_000 });
  }
  async close(): Promise<void> { await this.queue.close(); }
}
