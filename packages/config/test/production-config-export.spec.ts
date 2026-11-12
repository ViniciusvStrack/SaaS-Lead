import { describe, expect, it } from "vitest";

import {
  productionRequiredEnvKeys,
  validateProductionEnv,
  type ProductionConfigValidation,
  type ProductionEnvKey,
} from "../src/index.js";

describe("production configuration public exports", () => {
  it("re-exports the validator and its required keys from the package entrypoint", () => {
    expect(productionRequiredEnvKeys).toContain("DATABASE_URL");
    expect(productionRequiredEnvKeys).toContain("MERCADOPAGO_ACCESS_TOKEN");
    expect(typeof validateProductionEnv).toBe("function");
  });

  it("keeps the validation result type usable through the public entrypoint", () => {
    const result: ProductionConfigValidation = validateProductionEnv({});
    const key: ProductionEnvKey = "NODE_ENV";

    expect(result.ok).toBe(false);
    expect(key).toBe("NODE_ENV");
  });
});
