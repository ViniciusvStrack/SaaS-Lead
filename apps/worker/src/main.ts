import { loadConfig } from "@saas-lead/config";
import { createDatabaseClient } from "@saas-lead/database";
import { createLogger, withCorrelation } from "@saas-lead/observability";

import { createBullMqWorkerFactory } from "./bullmq-worker.factory.js";
import { NormalizeInboundProcessor } from "./processors/normalize-inbound.processor.js";
import { PrismaConversationStore } from "./processors/prisma-conversation.store.js";
import { createWorkerHandlers } from "./worker-handlers.js";
import { validateWorkerEnv } from "./worker-env.js";
import { WorkerRuntime } from "./worker-runtime.js";

const workerEnv = validateWorkerEnv(process.env);
const config = loadConfig(process.env);
const logger = createLogger(withCorrelation({}));
const database = createDatabaseClient(workerEnv.databaseUrl);
const normalize = new NormalizeInboundProcessor(new PrismaConversationStore(database));
const runtime = new WorkerRuntime(createBullMqWorkerFactory(workerEnv.redisUrl), createWorkerHandlers(normalize), (error) => logger.info("worker queue error", error));
runtime.start();
logger.info("worker ready", { nodeEnv: config.nodeEnv, queues: ["webhook.normalize"] });

let closing = false;
const shutdown = async (signal: string) => {
  if (closing) return;
  closing = true;
  logger.info("worker shutdown started", { signal });
  await runtime.close();
  await database.$disconnect();
  logger.info("worker shutdown complete", { signal });
};
process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
process.once("SIGINT", () => { void shutdown("SIGINT"); });
