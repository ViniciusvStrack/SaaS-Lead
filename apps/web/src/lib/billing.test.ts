import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCurrentSubscription } from "./billing.js";

afterEach(() => vi.unstubAllGlobals());

describe("billing api", () => {
  it("loads the current subscription with the session cookie", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ subscription: { id: "sub-1", planCode: "professional", planName: "Profissional", status: "ACTIVE" } }), { status: 200 }));
    await expect(loadCurrentSubscription("session", "https://api.test", fetcher)).resolves.toEqual({ status: "ready", subscription: { id: "sub-1", planCode: "professional", planName: "Profissional", status: "ACTIVE" } });
    expect(fetcher).toHaveBeenCalledWith("https://api.test/subscriptions/current", expect.objectContaining({ headers: { Cookie: "saas_lead_session=session" } }));
  });

  it("handles unauthenticated and unavailable states", async () => {
    await expect(loadCurrentSubscription(undefined, "https://api.test")).resolves.toEqual({ status: "unauthenticated" });
    await expect(loadCurrentSubscription("session", "https://api.test", vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")))).resolves.toEqual({ status: "unavailable" });
  });
});
