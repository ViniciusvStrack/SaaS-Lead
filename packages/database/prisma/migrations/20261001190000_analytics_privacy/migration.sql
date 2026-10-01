CREATE TABLE "CommercialOutcome" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "opportunityId" UUID NOT NULL,
  "outboundMessageId" UUID, "status" TEXT NOT NULL, "value" DECIMAL(14,2),
  "currency" TEXT NOT NULL DEFAULT 'BRL', "evidenceSource" TEXT, "evidenceRef" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CommercialOutcome_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PrivacyRequest" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "requestKey" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL, "subjectId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED', "legalHoldReason" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RetentionPolicy" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "messageDays" INTEGER NOT NULL DEFAULT 365,
  "auditDays" INTEGER NOT NULL DEFAULT 1825, "policyVersion" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommercialOutcome_organizationId_status_occurredAt_idx" ON "CommercialOutcome"("organizationId", "status", "occurredAt");
CREATE INDEX "CommercialOutcome_organizationId_opportunityId_idx" ON "CommercialOutcome"("organizationId", "opportunityId");
CREATE UNIQUE INDEX "PrivacyRequest_organizationId_requestKey_key" ON "PrivacyRequest"("organizationId", "requestKey");
CREATE INDEX "PrivacyRequest_organizationId_status_requestedAt_idx" ON "PrivacyRequest"("organizationId", "status", "requestedAt");
CREATE UNIQUE INDEX "RetentionPolicy_organizationId_key" ON "RetentionPolicy"("organizationId");
ALTER TABLE "CommercialOutcome" ADD CONSTRAINT "CommercialOutcome_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RetentionPolicy" ADD CONSTRAINT "RetentionPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
