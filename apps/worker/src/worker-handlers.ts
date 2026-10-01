import { z } from "zod";
import type { NormalizeInboundProcessor } from "./processors/normalize-inbound.processor.js";
import type { PrismaAnalysisRuntime } from "./processors/prisma-analysis.runtime.js";
import { conversationAnalyzeQueue, type AnalysisQueuePublisher } from "./queues/conversation-analysis.queue.js";
import { webhookNormalizeQueue } from "./queues/webhook-normalize.queue.js";
import type { QueueHandler } from "./worker-runtime.js";

const normalizeJobSchema = z.object({ webhookEventId: z.string().min(1), organizationId: z.string().min(1) }).strict();
const analysisJobSchema = z.object({ conversationId: z.string().min(1), organizationId: z.string().min(1), sourceWebhookEventId: z.string().min(1) }).strict();

export function createWorkerHandlers(normalize: Pick<NormalizeInboundProcessor, "process">, analyze: Pick<PrismaAnalysisRuntime, "process">, analysisQueue: AnalysisQueuePublisher): Record<string, QueueHandler> {
  return {
    [webhookNormalizeQueue]: async (data) => {
      const job = normalizeJobSchema.parse(data);
      const snapshot = await normalize.process(job);
      await analysisQueue.add({ organizationId: snapshot.organizationId, conversationId: snapshot.conversationId, sourceWebhookEventId: job.webhookEventId });
      return snapshot;
    },
    [conversationAnalyzeQueue]: async (data) => analyze.process(analysisJobSchema.parse(data)),
  };
}
