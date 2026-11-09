import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/load-config.js";

const validEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://localhost/saas_lead",
  REDIS_URL: "redis://localhost:6379",
  META_GRAPH_API_VERSION: "v25.0",
    META_APP_SECRET: "secret",
    META_WEBHOOK_VERIFY_TOKEN: "verify",
    BILLING_PROVIDER: "mercadopago",
    MERCADOPAGO_ACCESS_TOKEN: "access-token",
    MERCADOPAGO_API_URL: "https://api.mercadopago.com",
    MERCADOPAGO_BACK_URL: "https://example.com/billing/return",
    MERCADOPAGO_WEBHOOK_SECRET: "webhook-secret",
    MERCADOPAGO_PLAN_IDS_JSON: '{"essential":"plan-essential"}',
};

describe("loadConfig", () => {
  it("returns normalized typed configuration", () => {
    expect(loadConfig(validEnv)).toEqual({
      nodeEnv: "test",
      databaseUrl: "postgresql://localhost/saas_lead",
      redisUrl: "redis://localhost:6379",
      metaGraphApiVersion: "v25.0",
      metaAppSecret: "secret",
      metaWebhookVerifyToken: "verify",
      billingProvider: "mercadopago",
      mercadoPagoAccessToken: "access-token",
      mercadoPagoApiUrl: "https://api.mercadopago.com",
      mercadoPagoBackUrl: "https://example.com/billing/return",
      mercadoPagoWebhookSecret: "webhook-secret",
      mercadoPagoPlanIdsJson: '{"essential":"plan-essential"}',
      logLevel: "info",
    });
  });

  it.each(["DATABASE_URL", "REDIS_URL", "META_GRAPH_API_VERSION", "META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN", "MERCADOPAGO_ACCESS_TOKEN", "MERCADOPAGO_BACK_URL", "MERCADOPAGO_WEBHOOK_SECRET", "MERCADOPAGO_PLAN_IDS_JSON"] as const)(
    "fails early when %s is missing",
    (key) => {
      const env: Record<string, string | undefined> = { ...validEnv };
      delete env[key];

      expect(() => loadConfig(env)).toThrow(key);
    },
  );
});
