import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { GET, PUT } from "./route";

describe("settings proxy", () => {
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

    const response = await GET(new Request("https://web.test/api/settings"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Authentication required" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("forwards GET requests with the encoded session cookie and upstream status", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ segment: "retail" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    const response = await GET(new Request("https://web.test/api/settings"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ segment: "retail" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.test/organizations/current/settings",
      expect.objectContaining({
        method: "GET",
        headers: { Cookie: "saas_lead_session=session%20token" },
        cache: "no-store",
      }),
    );
  });

  it("forwards PUT requests with the session cookie, body, and upstream status", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ updated: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const body = JSON.stringify({ segment: "retail", tone: "consultivo" });

    const response = await PUT(
      new Request("https://web.test/api/settings", {
        method: "PUT",
        body,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ updated: true });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.test/organizations/current/settings",
      expect.objectContaining({
        method: "PUT",
        body,
        headers: {
          Cookie: "saas_lead_session=session%20token",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }),
    );
  });

  it("forwards an upstream API error status and response body", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: "Settings unavailable" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    const response = await GET(new Request("https://web.test/api/settings"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ message: "Settings unavailable" });
  });
});
