import { describe, expect, it } from "vitest";
import { createConnectivityProbe } from "../src/connectivity-probe.js";

describe("createConnectivityProbe", () => {
  it("dials the host and explicit port without exposing credentials", async () => {
    const calls: Array<{ host: string; port: number; timeoutMs: number }> = [];
    const probe = createConnectivityProbe("postgresql://user:secret@db.internal:6432/app", async (input) => { calls.push(input); return true; });

    await expect(probe()).resolves.toBe(true);
    expect(calls).toEqual([{ host: "db.internal", port: 6432, timeoutMs: 2000 }]);
    expect(JSON.stringify(calls)).not.toContain("secret");
  });

  it("uses protocol defaults and reports malformed configuration as unavailable", async () => {
    const ports: number[] = [];
    await createConnectivityProbe("redis://cache.internal", async ({ port }) => { ports.push(port); return true; })();
    const malformed = createConnectivityProbe("not-a-url", async () => true);

    expect(ports).toEqual([6379]);
    await expect(malformed()).resolves.toBe(false);
  });
});
