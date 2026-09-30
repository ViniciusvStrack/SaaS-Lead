export type OpportunityType = "QUOTE_ABANDONED" | "LEAD_GHOSTED" | "COMPANY_NO_RESPONSE";
export type OpportunityPriority = "MEDIUM" | "HIGH" | "URGENT";
export interface OpportunityCandidate { deduplicationKey: string; organizationId: string; conversationId: string; type: OpportunityType; priority: OpportunityPriority; knownValue: number | null; evidence: string[]; ruleVersion: "opportunity-rules.v1" }
