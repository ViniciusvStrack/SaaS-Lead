export type AttributionEvidence = { source: "CRM_STATUS" | "CUSTOMER_CONFIRMATION"; referenceId: string };
export type CommercialOutcome = { organizationId: string; opportunityId: string; status: "OPEN" | "WON" | "LOST"; knownValue?: number; evidence?: AttributionEvidence };
export type CommercialSummary = { attributedConversions: number; attributedRevenue: number; unattributedKnownValue: number; currency: "BRL" };

export class AnalyticsService {
  summarize(organizationId: string, outcomes: readonly CommercialOutcome[]): CommercialSummary {
    return outcomes.filter((outcome) => outcome.organizationId === organizationId && outcome.status === "WON").reduce<CommercialSummary>((summary, outcome) => {
      const value = outcome.knownValue ?? 0;
      if (outcome.evidence?.referenceId) {
        summary.attributedConversions += 1;
        summary.attributedRevenue += value;
      } else summary.unattributedKnownValue += value;
      return summary;
    }, { attributedConversions: 0, attributedRevenue: 0, unattributedKnownValue: 0, currency: "BRL" });
  }
}
