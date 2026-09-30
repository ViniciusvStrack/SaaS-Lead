import { describe, expect, it, vi } from "vitest";
import { MetaCloudProvider } from "../src/meta-cloud-provider.js";

describe("MetaCloudProvider contract", () => {
  it("pins the Graph version and keeps the credential in the authorization header", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
    const provider = new MetaCloudProvider("v25.0", "server-token", fetcher);
    await provider.getTemplates("waba-1");
    expect(fetcher).toHaveBeenCalledWith("https://graph.facebook.com/v25.0/waba-1/message_templates", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer server-token" }) }));
    expect(JSON.stringify(await provider.getTemplates("waba-1"))).not.toContain("server-token");
  });

  it("fails closed when the Graph version was not validated", () => {
    expect(() => new MetaCloudProvider("SET_AFTER_META_DASHBOARD_VALIDATION", "token")).toThrow("pinned");
  });
});
