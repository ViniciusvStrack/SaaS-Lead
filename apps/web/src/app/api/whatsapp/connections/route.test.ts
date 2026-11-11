import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { GET, POST } from "./route";

describe("WhatsApp connections proxy", () => {
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

    const response = await GET(new Request("https://web.test/api/whatsapp/connections"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Authentication required" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("forwards GET requests with the encoded session cookie", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ connections: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    const response = await GET(new Request("https://web.test/api/whatsapp/connections"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ connections: [] });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.test/whatsapp/connections",
      expect.objectContaining({
        method: "GET",
        headers: { Cookie: "saas_lead_session=session%20token" },
        cache: "no-store",
      }),
    );
  });

  it("forwards POST requests with the body and session cookie", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "connection-1" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const body = JSON.stringify({ accountId: "meta-account-1", phoneNumberId: "phone-1" });

    const response = await POST(
      new Request("https://web.test/api/whatsapp/connections", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: "connection-1" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.test/whatsapp/connections",
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

  it("returns 502 when the API request fails", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetcher);

    const response = await GET(new Request("https://web.test/api/whatsapp/connections"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ message: "API unavailable" });
  });
});
