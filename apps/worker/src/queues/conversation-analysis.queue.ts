import { createHash } from "node:crypto";
import { Queue } from "bullmq";

export const conversationAnalyzeQueue = "conversation.analyze" as const;
export interface AnalyzeConversationQueueJob { organizationId: string; conversationId: string; sourceWebhookEventId: string }
export interface AnalysisQueuePublisher { add(job: AnalyzeConversationQueueJob): Promise<void> }

export class BullMqAnalysisQueue implements AnalysisQueuePublisher {
  private readonly queue: Queue<AnalyzeConversationQueueJob>;
  constructor(redisUrl: string) {
    this.queue = new Queue(conversationAnalyzeQueue, { connection: { url: redisUrl, maxRetriesPerRequest: null }, prefix: "saas-lead" });
  }
  async add(job: AnalyzeConversationQueueJob): Promise<void> {
    const jobId = createHash("sha256").update(`${job.organizationId}:${job.sourceWebhookEventId}`).digest("hex");
    await this.queue.add(conversationAnalyzeQueue, job, { jobId, attempts: 5, backoff: { type: "exponential", delay: 2_000 }, removeOnComplete: 1_000, removeOnFail: 5_000 });
  }
  async close(): Promise<void> { await this.queue.close(); }
}
