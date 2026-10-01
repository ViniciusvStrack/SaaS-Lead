import { Worker } from "bullmq";
import type { QueueWorkerFactory } from "./worker-runtime.js";

export function createBullMqWorkerFactory(redisUrl: string, concurrency = 5): QueueWorkerFactory {
  if (!redisUrl) throw new Error("REDIS_URL is required");
  return (queue, process) => {
    const worker = new Worker(queue, (job) => process(job.data), {
      connection: { url: redisUrl, maxRetriesPerRequest: null },
      concurrency,
      prefix: "saas-lead",
    });
    return {
      close: () => worker.close(),
      onError: (listener) => { worker.on("error", listener); },
    };
  };
}
