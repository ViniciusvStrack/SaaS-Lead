import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().trim().min(1, "REDIS_URL is required"),
  META_GRAPH_API_VERSION: z.string().trim().min(1, "META_GRAPH_API_VERSION is required"),
  META_APP_SECRET: z.string().trim().min(1, "META_APP_SECRET is required"),
  META_WEBHOOK_VERIFY_TOKEN: z.string().trim().min(1, "META_WEBHOOK_VERIFY_TOKEN is required"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});
