import "reflect-metadata";

import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { DATABASE_PROBE, REDIS_PROBE } from "../src/readiness.service.js";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/saas_lead";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.META_GRAPH_API_VERSION ??= "v20.0";
process.env.META_APP_SECRET ??= "test-meta-secret";
process.env.META_WEBHOOK_VERIFY_TOKEN ??= "test-webhook-token";
process.env.MERCADOPAGO_ACCESS_TOKEN ??= "test-mp-token";
process.env.MERCADOPAGO_BACK_URL ??= "http://localhost:3000/billing/return";
process.env.MERCADOPAGO_WEBHOOK_SECRET ??= "test-mp-webhook-secret";
process.env.MERCADOPAGO_PLAN_IDS_JSON ??= '{"essential":"essential","professional":"professional","performance":"performance","jarvis":"jarvis"}';

const { AppModule } = await import("../src/app.module.js");

describe("health endpoints", () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => close?.());

  async function createTestApp(database: boolean, redis: boolean) {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_PROBE)
      .useValue(async () => database)
      .overrideProvider(REDIS_PROBE)
      .useValue(async () => redis)
      .compile();
    const app = module.createNestApplication();
    await app.init();
    close = () => app.close();
    return app;
  }

  it("returns liveness without consulting unavailable dependencies", async () => {
    const app = await createTestApp(false, false);

    await request(app.getHttpServer()).get("/health").expect(200, { status: "ok" });
  });

  it("returns readiness details when dependencies are available", async () => {
    const app = await createTestApp(true, true);

    const response = await request(app.getHttpServer()).get("/ready").expect(200);
    expect(response.body.ready).toBe(true);
    expect(response.body.dependencies).toEqual({ database: true, redis: true });
    expect(response.body.latencyMs.database).toBeTypeOf("number");
    expect(response.body.latencyMs.redis).toBeTypeOf("number");
  });

  it("returns 503 and dependency details when Redis is unavailable", async () => {
    const app = await createTestApp(true, false);
    const response = await request(app.getHttpServer()).get("/ready").expect(503);

    expect(response.body.ready).toBe(false);
    expect(response.body.dependencies).toEqual({ database: true, redis: false });
    expect(response.body.latencyMs.database).toBeTypeOf("number");
    expect(response.body.latencyMs.redis).toBeTypeOf("number");
  });
});
