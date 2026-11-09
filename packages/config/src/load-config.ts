import { envSchema } from "./env.schema.js";

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  databaseUrl: string;
  redisUrl: string;
  metaGraphApiVersion: string;
  metaAppSecret: string;
  metaWebhookVerifyToken: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const parsed = envSchema.parse(env);
  return {
    nodeEnv: parsed.NODE_ENV,
    databaseUrl: parsed.DATABASE_URL,
    redisUrl: parsed.REDIS_URL,
    metaGraphApiVersion: parsed.META_GRAPH_API_VERSION,
    metaAppSecret: parsed.META_APP_SECRET,
    metaWebhookVerifyToken: parsed.META_WEBHOOK_VERIFY_TOKEN,
    logLevel: parsed.LOG_LEVEL,
  };
}
