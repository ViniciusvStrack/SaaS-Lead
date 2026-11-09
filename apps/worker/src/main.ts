import { loadConfig } from "@saas-lead/config";
import { createDatabaseClient } from "@saas-lead/database";
import { createLogger, withCorrelation } from "@saas-lead/observability";
import { PolicyEngine } from "@saas-lead/policy";

import { createAnalysisProvider, createSuggestionProvider, loadAiProviderSettings } from "./ai-provider.config.js";
import { createBullMqWorkerFactory } from "./bullmq-worker.factory.js";
import { NormalizeInboundProcessor } from "./processors/normalize-inbound.processor.js";
import { PrismaAnalysisRuntime } from "./processors/prisma-analysis.runtime.js";
import { PrismaOpportunityRuntime } from "./processors/prisma-opportunity.runtime.js";
import { PrismaReconcileRuntime } from "./processors/prisma-reconcile.runtime.js";
import { PrismaSendRuntime } from "./processors/prisma-send.runtime.js";
import { MetaSendProvider } from "./processors/meta-send.provider.js";
import { PrismaSuggestionRuntime } from "./processors/prisma-suggestion.runtime.js";
import { PrismaConversationStore } from "./processors/prisma-conversation.store.js";
import { BullMqAnalysisQueue, conversationAnalyzeQueue } from "./queues/conversation-analysis.queue.js";
import { BullMqOpportunityQueue, opportunityDetectQueue } from "./queues/opportunity-detect.queue.js";
import { messageReconcileQueue } from "./queues/outbound.queues.js";
import { createWorkerHandlers } from "./worker-handlers.js";
import { validateWorkerEnv } from "./worker-env.js";
import { WorkerRuntime } from "./worker-runtime.js";

const workerEnv = validateWorkerEnv(process.env);
const config = loadConfig(process.env);
const logger = createLogger(withCorrelation({}));
const database = createDatabaseClient(workerEnv.databaseUrl);
const aiSettings = loadAiProviderSettings(process.env);
const ai = createAnalysisProvider(aiSettings);
const suggestion = createSuggestionProvider(aiSettings);
const normalize = new NormalizeInboundProcessor(new PrismaConversationStore(database));
const analyze = new PrismaAnalysisRuntime(database, ai.provider, { model: ai.model, promptVersion: ai.promptVersion, providerName: ai.providerName });
const analysisQueue = new BullMqAnalysisQueue(workerEnv.redisUrl);
const opportunityQueue = new BullMqOpportunityQueue(workerEnv.redisUrl);
const detect = new PrismaOpportunityRuntime(database);
const suggest = new PrismaSuggestionRuntime(database, suggestion.provider, { model: suggestion.model, promptVersion: suggestion.promptVersion, providerName: suggestion.providerName });
const policy = new PolicyEngine();
const send = new PrismaSendRuntime(
  database,
  new MetaSendProvider(database, config.metaGraphApiVersion, process.env.META_ACCESS_TOKEN ?? ""),
  policy,
);
const reconcile = new PrismaReconcileRuntime(database);
const runtime = new WorkerRuntime(createBullMqWorkerFactory(workerEnv.redisUrl), createWorkerHandlers(normalize, analyze, analysisQueue, opportunityQueue, detect, suggest, send, reconcile), (error) => logger.info("worker queue error", error));
runtime.start();
logger.info("worker ready", { nodeEnv: config.nodeEnv, queues: ["webhook.normalize", conversationAnalyzeQueue, opportunityDetectQueue, "message.send", messageReconcileQueue] });

let closing = false;
const shutdown = async (signal: string) => {
  if (closing) return;
  closing = true;
  logger.info("worker shutdown started", { signal });
  await runtime.close();
  await analysisQueue.close();
  await opportunityQueue.close();
  await database.$disconnect();
  logger.info("worker shutdown complete", { signal });
};
process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
process.once("SIGINT", () => { void shutdown("SIGINT"); });
