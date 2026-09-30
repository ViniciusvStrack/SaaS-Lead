import type { OpportunityCandidate } from "@saas-lead/contracts";
import type { TenantContext } from "@saas-lead/database";

export interface OpportunityView extends OpportunityCandidate {
  id: string;
  status: "OPEN" | "IN_PROGRESS" | "WON" | "LOST";
  detectedAt: Date;
}

export interface OpportunityPage {
  items: OpportunityView[];
  nextCursor?: string;
}

export abstract class OpportunityRepository {
  abstract upsertDetected(tenant: TenantContext, candidate: OpportunityCandidate): Promise<OpportunityView>;
  abstract list(
    tenant: TenantContext,
    options?: { cursor?: string; limit?: number },
  ): Promise<OpportunityPage>;
}
