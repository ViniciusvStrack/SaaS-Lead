import { describe, expect, it } from "vitest";
import { AnalyticsService } from "../src/modules/analytics/analytics.service.js";

describe("commercial analytics attribution", () => {
  it("separates evidence-backed revenue from known but unattributed value", () => {
    const service = new AnalyticsService();
    const summary = service.summarize("org-a", [
      { organizationId: "org-a", opportunityId: "opp-1", status: "WON", knownValue: 4900, evidence: { source: "CRM_STATUS", referenceId: "deal-91" } },
      { organizationId: "org-a", opportunityId: "opp-2", status: "WON", knownValue: 3000 },
      { organizationId: "org-a", opportunityId: "opp-3", status: "OPEN", knownValue: 1200, evidence: { source: "CUSTOMER_CONFIRMATION", referenceId: "msg-7" } },
      { organizationId: "org-b", opportunityId: "opp-4", status: "WON", knownValue: 9999, evidence: { source: "CRM_STATUS", referenceId: "deal-22" } },
    ]);

    expect(summary).toEqual({
      attributedConversions: 1,
      attributedRevenue: 4900,
      unattributedKnownValue: 3000,
      currency: "BRL",
    });
  });
});
