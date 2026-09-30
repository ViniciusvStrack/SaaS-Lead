import { z } from "zod";

const workerEnvSchema = z.object({
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().trim().min(1, "REDIS_URL is required"),
});

export interface WorkerEnv {
  databaseUrl: string;
  redisUrl: string;
}

export function validateWorkerEnv(env: Record<string, string | undefined>): WorkerEnv {
  const parsed = workerEnvSchema.parse(env);
  return { databaseUrl: parsed.DATABASE_URL, redisUrl: parsed.REDIS_URL };
}
