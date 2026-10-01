import { z } from "zod";
import type { NormalizeInboundProcessor } from "./processors/normalize-inbound.processor.js";
import { webhookNormalizeQueue } from "./queues/webhook-normalize.queue.js";
import type { QueueHandler } from "./worker-runtime.js";

const normalizeJobSchema = z.object({ webhookEventId: z.string().min(1), organizationId: z.string().min(1) }).strict();

export function createWorkerHandlers(normalize: Pick<NormalizeInboundProcessor, "process">): Record<string, QueueHandler> {
  return {
    [webhookNormalizeQueue]: async (data) => normalize.process(normalizeJobSchema.parse(data))
  };
}
