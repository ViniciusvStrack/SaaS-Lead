import { afterEach, describe, expect, it, vi } from "vitest";
import { requestLoginLink, verifyLoginToken } from "./auth-api";

afterEach(() => vi.unstubAllGlobals());

describe("auth API client", () => {
  it("requests and verifies one-time login tokens without caching", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ accepted: true, verificationToken: "magic" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sessionToken: "session", expiresAt: "2099-01-01T00:00:00.000Z" }) });
    vi.stubGlobal("fetch", fetcher);
    process.env.API_BASE_URL = "http://api.test/";
    await expect(requestLoginLink("owner@example.test")).resolves.toMatchObject({ verificationToken: "magic" });
    await expect(verifyLoginToken("magic")).resolves.toMatchObject({ sessionToken: "session" });
    expect(fetcher).toHaveBeenNthCalledWith(1, "http://api.test/auth/request-link", expect.objectContaining({ method: "POST", cache: "no-store" }));
    expect(fetcher).toHaveBeenNthCalledWith(2, "http://api.test/auth/verify", expect.objectContaining({ method: "POST", cache: "no-store" }));
  });
});
