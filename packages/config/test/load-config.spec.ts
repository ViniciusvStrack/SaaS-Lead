import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/load-config.js";

const validEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://localhost/saas_lead",
  REDIS_URL: "redis://localhost:6379",
  META_GRAPH_API_VERSION: "v25.0",
};

describe("loadConfig", () => {
  it("returns normalized typed configuration", () => {
    expect(loadConfig(validEnv)).toEqual({
      nodeEnv: "test",
      databaseUrl: "postgresql://localhost/saas_lead",
      redisUrl: "redis://localhost:6379",
      metaGraphApiVersion: "v25.0",
      logLevel: "info",
    });
  });

  it.each(["DATABASE_URL", "REDIS_URL", "META_GRAPH_API_VERSION"] as const)(
    "fails early when %s is missing",
    (key) => {
      const env: Record<string, string | undefined> = { ...validEnv };
      delete env[key];

      expect(() => loadConfig(env)).toThrow(key);
    },
  );
});
