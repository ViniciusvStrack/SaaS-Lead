import { describe, expect, it } from "vitest";

import { validateWorkerEnv } from "../src/worker-env.js";

describe("validateWorkerEnv", () => {
  it("returns normalized database and Redis URLs", () => {
    expect(
      validateWorkerEnv({
        DATABASE_URL: "postgresql://localhost/saas_lead",
        REDIS_URL: "redis://localhost:6379",
      }),
    ).toEqual({
      databaseUrl: "postgresql://localhost/saas_lead",
      redisUrl: "redis://localhost:6379",
    });
  });

  it.each(["DATABASE_URL", "REDIS_URL"] as const)(
    "rejects startup when %s is missing",
    (missingKey) => {
      const env: Record<string, string> = {
        DATABASE_URL: "postgresql://localhost/saas_lead",
        REDIS_URL: "redis://localhost:6379",
      };
      delete env[missingKey];

      expect(() => validateWorkerEnv(env)).toThrow(missingKey);
    },
  );
});
