import { envSchema } from "./env.schema.js";

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  databaseUrl: string;
  redisUrl: string;
  metaGraphApiVersion: string;
  metaAppSecret: string;
  metaWebhookVerifyToken: string;
  billingProvider: "mercadopago";
  mercadoPagoAccessToken: string;
  mercadoPagoApiUrl: string;
  mercadoPagoBackUrl: string;
  mercadoPagoWebhookSecret: string;
  mercadoPagoPlanIdsJson: string;
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
    billingProvider: parsed.BILLING_PROVIDER,
    mercadoPagoAccessToken: parsed.MERCADOPAGO_ACCESS_TOKEN,
    mercadoPagoApiUrl: parsed.MERCADOPAGO_API_URL,
    mercadoPagoBackUrl: parsed.MERCADOPAGO_BACK_URL,
    mercadoPagoWebhookSecret: parsed.MERCADOPAGO_WEBHOOK_SECRET,
    mercadoPagoPlanIdsJson: parsed.MERCADOPAGO_PLAN_IDS_JSON,
    logLevel: parsed.LOG_LEVEL,
  };
}
