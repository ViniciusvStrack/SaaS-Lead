import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { POST } from "./route";

describe("Billing subscribe proxy", () => {
  beforeEach(() => {
    process.env.API_BASE_URL = "https://api.test/";
    cookiesMock.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: "session token" }) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cookiesMock.mockReset();
    delete process.env.API_BASE_URL;
  });

  it("forwards a successful subscription response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ checkoutUrl: "https://checkout.test" }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(new Request("https://web.test/api/billing/subscribe", {
      method: "POST",
      body: JSON.stringify({ planCode: "starter" }),
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ checkoutUrl: "https://checkout.test" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.test/subscriptions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ planCode: "starter" }),
        headers: { "Content-Type": "application/json", Cookie: "saas_lead_session=session%20token" },
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("preserves a safe JSON 4xx response", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: "Plan unavailable" }), { status: 422 }),
    ));

    const response = await POST(new Request("https://web.test/api/billing/subscribe", { method: "POST", body: "{}" }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ message: "Plan unavailable" });
  });

  it("preserves a safe JSON 5xx response", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: "Subscription rejected" }), { status: 503 }),
    ));

    const response = await POST(new Request("https://web.test/api/billing/subscribe", { method: "POST", body: "{}" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ message: "Subscription rejected" });
  });

  it("returns a safe 502 for invalid upstream responses", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response("upstream details", { status: 500 })));

    const response = await POST(new Request("https://web.test/api/billing/subscribe", { method: "POST", body: "{}" }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ message: "Billing service unavailable" });
  });

  it("returns a safe 502 when the upstream rejects, including timeout aborts", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new DOMException("The operation was aborted", "AbortError"));
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(new Request("https://web.test/api/billing/subscribe", { method: "POST", body: "{}" }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ message: "Billing service unavailable" });
    expect(fetcher.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
});
