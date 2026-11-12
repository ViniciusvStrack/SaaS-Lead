import { envSchema } from "./env.schema.js";
import type { AppConfig } from "./load-config.js";

export const productionRequiredEnvKeys = [
  "NODE_ENV",
  "DATABASE_URL",
  "REDIS_URL",
  "META_GRAPH_API_VERSION",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_API_URL",
  "MERCADOPAGO_BACK_URL",
  "MERCADOPAGO_WEBHOOK_SECRET",
  "MERCADOPAGO_PLAN_IDS_JSON",
] as const;

export type ProductionEnvKey = (typeof productionRequiredEnvKeys)[number];

export type ProductionConfigValidation =
  | { ok: true; config: AppConfig }
  | { ok: false; errors: ReadonlyArray<ProductionConfigError> };

export type ProductionConfigError = {
  key: ProductionEnvKey;
  reason: "missing" | "invalid";
  message: string;
};

/**
 * Validates the complete production environment without returning or logging
 * any secret value. This is intended for startup checks and deployment gates.
 */
export function validateProductionEnv(env: Record<string, string | undefined>): ProductionConfigValidation {
  const errors: ProductionConfigError[] = [];

  for (const key of productionRequiredEnvKeys) {
    if (env[key]?.trim()) continue;
    errors.push({ key, reason: "missing", message: `${key} must be configured for production` });
  }

  if (env.NODE_ENV?.trim() && env.NODE_ENV !== "production") {
    errors.push({ key: "NODE_ENV", reason: "invalid", message: "NODE_ENV must be production" });
  }

  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const invalidKeys = new Set(
      parsed.error.issues
        .map((issue) => issue.path[0])
        .filter((key): key is ProductionEnvKey => productionRequiredEnvKeys.includes(key as ProductionEnvKey)),
    );

    for (const key of invalidKeys) {
      if (errors.some((error) => error.key === key)) continue;
      errors.push({ key, reason: "invalid", message: `${key} has an invalid production value` });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const config = parsed.success ? parsed.data : undefined;
  if (!config) {
    return {
      ok: false,
      errors: [{ key: "NODE_ENV", reason: "invalid", message: "Production configuration could not be validated" }],
    };
  }

  return {
    ok: true,
    config: {
      nodeEnv: config.NODE_ENV,
      databaseUrl: config.DATABASE_URL,
      redisUrl: config.REDIS_URL,
      metaGraphApiVersion: config.META_GRAPH_API_VERSION,
      metaAppSecret: config.META_APP_SECRET,
      metaWebhookVerifyToken: config.META_WEBHOOK_VERIFY_TOKEN,
      billingProvider: config.BILLING_PROVIDER,
      mercadoPagoAccessToken: config.MERCADOPAGO_ACCESS_TOKEN,
      mercadoPagoApiUrl: config.MERCADOPAGO_API_URL,
      mercadoPagoBackUrl: config.MERCADOPAGO_BACK_URL,
      mercadoPagoWebhookSecret: config.MERCADOPAGO_WEBHOOK_SECRET,
      mercadoPagoPlanIdsJson: config.MERCADOPAGO_PLAN_IDS_JSON,
      logLevel: config.LOG_LEVEL,
    },
  };
}
