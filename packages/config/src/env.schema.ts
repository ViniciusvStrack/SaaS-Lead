import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().trim().min(1, "REDIS_URL is required"),
  META_GRAPH_API_VERSION: z.string().trim().min(1, "META_GRAPH_API_VERSION is required"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});
