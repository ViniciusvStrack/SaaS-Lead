CREATE TABLE "WhatsAppAccount" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "externalAccountId" TEXT NOT NULL,
  "credentialReference" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppAccount_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WhatsAppNumber" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "accountId" UUID NOT NULL,
  "externalNumberId" TEXT NOT NULL, "displayNumber" TEXT, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppNumber_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WebhookEvent" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "numberId" UUID NOT NULL,
  "externalId" TEXT NOT NULL, "payload" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3), CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsAppAccount_externalAccountId_key" ON "WhatsAppAccount"("externalAccountId");
CREATE INDEX "WhatsAppAccount_organizationId_status_idx" ON "WhatsAppAccount"("organizationId", "status");
CREATE UNIQUE INDEX "WhatsAppNumber_externalNumberId_key" ON "WhatsAppNumber"("externalNumberId");
CREATE INDEX "WhatsAppNumber_organizationId_status_idx" ON "WhatsAppNumber"("organizationId", "status");
CREATE UNIQUE INDEX "WebhookEvent_externalId_key" ON "WebhookEvent"("externalId");
CREATE INDEX "WebhookEvent_status_receivedAt_idx" ON "WebhookEvent"("status", "receivedAt");
CREATE INDEX "WebhookEvent_organizationId_receivedAt_idx" ON "WebhookEvent"("organizationId", "receivedAt");
ALTER TABLE "WhatsAppAccount" ADD CONSTRAINT "WhatsAppAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppNumber" ADD CONSTRAINT "WhatsAppNumber_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppNumber" ADD CONSTRAINT "WhatsAppNumber_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "WhatsAppAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_numberId_fkey" FOREIGN KEY ("numberId") REFERENCES "WhatsAppNumber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
