import "reflect-metadata";

import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { AppModule } from "../src/app.module.js";
import { DATABASE_PROBE, REDIS_PROBE } from "../src/readiness.service.js";

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

    await request(app.getHttpServer()).get("/ready").expect(200, {
      ready: true,
      dependencies: { database: true, redis: true },
    });
  });

  it("returns 503 and dependency details when Redis is unavailable", async () => {
    const app = await createTestApp(true, false);
    const response = await request(app.getHttpServer()).get("/ready").expect(503);

    expect(response.body).toEqual({
      ready: false,
      dependencies: { database: true, redis: false },
    });
  });
});
