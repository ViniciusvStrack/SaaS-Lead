CREATE TABLE "AIAnalysis" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "conversationId" UUID NOT NULL,
  "inputHash" TEXT NOT NULL, "promptVersion" TEXT NOT NULL, "model" TEXT NOT NULL,
  "analysis" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UsageRecord" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "inputHash" TEXT NOT NULL,
  "provider" TEXT NOT NULL, "model" TEXT NOT NULL, "inputTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL, "estimatedCost" DECIMAL(12,6),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AIAnalysis_organizationId_inputHash_key" ON "AIAnalysis"("organizationId", "inputHash");
CREATE INDEX "AIAnalysis_organizationId_conversationId_createdAt_idx" ON "AIAnalysis"("organizationId", "conversationId", "createdAt");
CREATE UNIQUE INDEX "UsageRecord_organizationId_inputHash_provider_key" ON "UsageRecord"("organizationId", "inputHash", "provider");
CREATE INDEX "UsageRecord_organizationId_createdAt_idx" ON "UsageRecord"("organizationId", "createdAt");
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
