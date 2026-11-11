import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { GET } from "./route";

describe("Billing usage proxy", () => {
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

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Authentication required" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("forwards the authenticated session to the API", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ usage: [], cycle: { used: 0 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ usage: [], cycle: { used: 0 } });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.test/subscriptions/usage",
      expect.objectContaining({
        headers: { Cookie: "saas_lead_session=session%20token" },
        cache: "no-store",
      }),
    );
  });

});
