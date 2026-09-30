CREATE TABLE "Opportunity" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "deduplicationKey" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "knownValue" DECIMAL(14,2),
  "ruleVersion" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpportunityEvent" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "opportunityId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunityEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Opportunity_organizationId_deduplicationKey_key" ON "Opportunity"("organizationId", "deduplicationKey");
CREATE INDEX "Opportunity_organizationId_status_priority_detectedAt_idx" ON "Opportunity"("organizationId", "status", "priority", "detectedAt");
CREATE INDEX "Opportunity_organizationId_conversationId_idx" ON "Opportunity"("organizationId", "conversationId");
CREATE INDEX "OpportunityEvent_organizationId_opportunityId_occurredAt_idx" ON "OpportunityEvent"("organizationId", "opportunityId", "occurredAt");

ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityEvent" ADD CONSTRAINT "OpportunityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityEvent" ADD CONSTRAINT "OpportunityEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
