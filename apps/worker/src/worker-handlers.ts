import { z } from "zod";
import type { NormalizeInboundProcessor } from "./processors/normalize-inbound.processor.js";
import type { PrismaAnalysisRuntime } from "./processors/prisma-analysis.runtime.js";
import type { PrismaOpportunityRuntime } from "./processors/prisma-opportunity.runtime.js";
import type { PrismaSuggestionRuntime } from "./processors/prisma-suggestion.runtime.js";
import { conversationAnalyzeQueue, type AnalysisQueuePublisher } from "./queues/conversation-analysis.queue.js";
import { opportunityDetectQueue, type OpportunityQueuePublisher } from "./queues/opportunity-detect.queue.js";
import { webhookNormalizeQueue } from "./queues/webhook-normalize.queue.js";
import type { QueueHandler } from "./worker-runtime.js";

const normalizeJobSchema = z.object({ webhookEventId: z.string().min(1), organizationId: z.string().min(1) }).strict();
const analysisJobSchema = z.object({ conversationId: z.string().min(1), organizationId: z.string().min(1), sourceWebhookEventId: z.string().min(1) }).strict();

export function createWorkerHandlers(normalize: Pick<NormalizeInboundProcessor, "process">, analyze: Pick<PrismaAnalysisRuntime, "process">, analysisQueue: AnalysisQueuePublisher, opportunityQueue: OpportunityQueuePublisher, detect: Pick<PrismaOpportunityRuntime, "process">, suggest: Pick<PrismaSuggestionRuntime, "process">): Record<string, QueueHandler> {
  return {
    [webhookNormalizeQueue]: async (data) => {
      const job = normalizeJobSchema.parse(data);
      const snapshot = await normalize.process(job);
      await analysisQueue.add({ organizationId: snapshot.organizationId, conversationId: snapshot.conversationId, sourceWebhookEventId: job.webhookEventId });
      return snapshot;
    },
    [conversationAnalyzeQueue]: async (data) => {
      const job = analysisJobSchema.parse(data);
      const result = await analyze.process(job);
      if (result.analysis.intent === "PURCHASE" && result.lastInboundAt) {
        await opportunityQueue.schedule(job, new Date(result.lastInboundAt.getTime() + 4 * 60 * 60 * 1000));
      }
      return result;
    },
    [opportunityDetectQueue]: async (data) => {
      const job = analysisJobSchema.parse(data);
      const candidates = await detect.process({ organizationId: job.organizationId, conversationId: job.conversationId });
      if (candidates.length === 0) return { candidates, suggestion: null };
      const suggestion = await suggest.process({ organizationId: job.organizationId, conversationId: job.conversationId });
      return { candidates, suggestion: suggestion ?? null };
    },
  };
}
