export const webhookNormalizeQueue = "webhook.normalize" as const;
export const webhookNormalizeDeadLetterQueue = "webhook.normalize.dead-letter" as const;

export interface NormalizeWebhookJob {
  webhookEventId: string;
  organizationId: string;
}

export interface NormalizeDeadLetter {
  jobId: string;
  queue: typeof webhookNormalizeDeadLetterQueue;
  webhookEventId: string;
  organizationId: string;
  attempts: number;
  reason: string;
  failedAt: Date;
}

export function deterministicJobId(organizationId: string, webhookEventId: string): string {
  return `${webhookNormalizeQueue}:${organizationId}:${webhookEventId}`;
}

export function toDeadLetter(
  job: NormalizeWebhookJob,
  error: unknown,
  attempts: number,
  failedAt = new Date(),
): NormalizeDeadLetter {
  return {
    jobId: deterministicJobId(job.organizationId, job.webhookEventId),
    queue: webhookNormalizeDeadLetterQueue,
    webhookEventId: job.webhookEventId,
    organizationId: job.organizationId,
    attempts,
    reason: error instanceof Error ? error.message : "unknown failure",
    failedAt,
  };
}
