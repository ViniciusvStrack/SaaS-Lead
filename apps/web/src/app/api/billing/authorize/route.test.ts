import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { POST } from "./route";

describe("Billing authorization proxy", () => {
  beforeEach(() => {
    process.env.API_BASE_URL = "https://api.test/";
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "session token" }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cookiesMock.mockReset();
    delete process.env.API_BASE_URL;
  });

  it("returns 401 without a session and does not call the API", async () => {
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);
    cookiesMock.mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) });

    const response = await POST(
      new Request("https://web.test/api/billing/authorize", {
        method: "POST",
        body: JSON.stringify({ action: "conversation.reply" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Authentication required" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("forwards the POST body, encoded session cookie, and upstream status", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ allowed: false, reason: "limit_exceeded" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const body = JSON.stringify({ action: "conversation.reply", quantity: 1 });

    const response = await POST(
      new Request("https://web.test/api/billing/authorize", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ allowed: false, reason: "limit_exceeded" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.test/subscriptions/authorize",
      expect.objectContaining({
        method: "POST",
        body,
        headers: {
          Cookie: "saas_lead_session=session%20token",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }),
    );
  });

  it("propagates a network failure from the API request", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetcher);

    await expect(
      POST(
        new Request("https://web.test/api/billing/authorize", {
          method: "POST",
          body: JSON.stringify({ action: "conversation.reply" }),
        }),
      ),
    ).rejects.toThrow("offline");
  });
});
