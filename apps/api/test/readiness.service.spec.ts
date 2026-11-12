import { describe, expect, it, vi } from "vitest";

import { ReadinessService } from "../src/readiness.service.js";

describe("ReadinessService", () => {
  it("reports dependency status and latency independently", async () => {
    const service = new ReadinessService(async () => true, async () => false);

    const result = await service.check();

    expect(result.ready).toBe(false);
    expect(result.dependencies).toEqual({ database: true, redis: false });
    expect(result.latencyMs.database).toBeGreaterThanOrEqual(0);
    expect(result.latencyMs.redis).toBeGreaterThanOrEqual(0);
  });

  it("fails closed and records latency when a probe throws", async () => {
    const service = new ReadinessService(async () => { throw new Error("database down"); }, async () => true);

    const result = await service.check();

    expect(result.ready).toBe(false);
    expect(result.dependencies).toEqual({ database: false, redis: true });
    expect(result.latencyMs.database).toBeGreaterThanOrEqual(0);
  });

  it("runs probes concurrently", async () => {
    const release = vi.fn();
    const service = new ReadinessService(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); release("database"); return true; }, async () => { await new Promise((resolve) => setTimeout(resolve, 5)); release("redis"); return true; });

    const result = await service.check();

    expect(result.ready).toBe(true);
    expect(release).toHaveBeenCalledTimes(2);
  });
});
