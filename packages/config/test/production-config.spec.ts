import { describe, expect, it } from "vitest";

import { productionRequiredEnvKeys, validateProductionEnv } from "../src/production-config.js";

const validProductionEnv: Record<string, string> = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://db.internal/saas_lead",
  REDIS_URL: "redis://redis.internal:6379",
  META_GRAPH_API_VERSION: "v25.0",
  META_APP_SECRET: "do-not-log-meta-secret",
  META_WEBHOOK_VERIFY_TOKEN: "do-not-log-verify-token",
  BILLING_PROVIDER: "mercadopago",
  MERCADOPAGO_ACCESS_TOKEN: "do-not-log-access-token",
  MERCADOPAGO_API_URL: "https://api.mercadopago.com",
  MERCADOPAGO_BACK_URL: "https://app.example.com/billing/return",
  MERCADOPAGO_WEBHOOK_SECRET: "do-not-log-webhook-secret",
  MERCADOPAGO_PLAN_IDS_JSON: '{"essential":"plan-essential"}',
};

describe("validateProductionEnv", () => {
  it("accepts a complete production environment and normalizes its config", () => {
    const result = validateProductionEnv(validProductionEnv);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.nodeEnv).toBe("production");
      expect(result.config.billingProvider).toBe("mercadopago");
    }
  });

  it("reports all missing required keys without exposing values", () => {
    const result = validateProductionEnv({});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((error) => error.key)).toEqual(expect.arrayContaining(productionRequiredEnvKeys));
      expect(result.errors.every((error) => error.reason === "missing")).toBe(true);
      expect(JSON.stringify(result)).not.toContain("do-not-log");
    }
  });

  it("rejects a non-production environment and malformed URLs", () => {
    const result = validateProductionEnv({ ...validProductionEnv, NODE_ENV: "development", MERCADOPAGO_BACK_URL: "not-a-url" });

    expect(result).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        { key: "NODE_ENV", reason: "invalid", message: "NODE_ENV must be production" },
        { key: "MERCADOPAGO_BACK_URL", reason: "invalid", message: "MERCADOPAGO_BACK_URL has an invalid production value" },
      ]),
    });
  });

  it("treats whitespace-only secrets as missing without returning the secret", () => {
    const result = validateProductionEnv({ ...validProductionEnv, META_APP_SECRET: "   " });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ key: "META_APP_SECRET", reason: "missing", message: "META_APP_SECRET must be configured for production" });
      expect(JSON.stringify(result)).not.toContain("META_APP_SECRET: ");
    }
  });
});
