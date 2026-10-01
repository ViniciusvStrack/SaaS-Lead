import { describe, expect, it } from "vitest";
import { loadOpportunities } from "./opportunities.js";

describe("loadOpportunities", () => {
  it("loads tenant-scoped opportunities through the session cookie", async () => {
    let sentCookie: string | undefined;
    const fetcher: typeof fetch = async (_url, init) => {
      sentCookie = (init?.headers as Record<string, string>)?.Cookie;
      return new Response(JSON.stringify({ items: [{ id: "opp-1", contactName: "Cliente A", type: "COMPANY_NO_RESPONSE", priority: "URGENT", knownValue: null, evidence: ["sem resposta"], ruleVersion: "opportunity-rules.v1" }] }), { status: 200 });
    };
    const result = await loadOpportunities("opaque-token", "http://localhost:3001", fetcher);
    expect(sentCookie).toBe("saas_lead_session=opaque-token");
    expect(result.status).toBe("ready");
    if (result.status === "ready") expect(result.items[0]?.contactName).toBe("Cliente A");
  });

  it("does not request customer data without a session", async () => {
    const fetcher: typeof fetch = async () => { throw new Error("must not fetch"); };
    expect(await loadOpportunities(undefined, "http://localhost:3001", fetcher)).toEqual({ status: "unauthenticated" });
  });
});
